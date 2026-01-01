import type { EditorView } from "@codemirror/view";
import type { Text } from "@codemirror/state";
import { isTaskLine, isRegularListLine, parseTaskLine, parseRegularListLine } from "./task-list-utils";

const MARKDOWN_HEADING = /^#{1,6}\s+\S/;
const EMPTY_LINE = /^\s*$/u;

type BlockRange = {
  start: number;
  end: number;
  content: string;
};

const isListLine = (text: string): boolean => isTaskLine(text) || isRegularListLine(text);
const isHeadingLine = (text: string): boolean => MARKDOWN_HEADING.test(text);
const isEmptyLine = (text: string): boolean => EMPTY_LINE.test(text);

/**
 * Parse a list-like line once and return indent length.
 * This avoids parsing twice (task->list) on hot paths.
 */
const getIndentLevel = (text: string): number => {
  const taskParsed = parseTaskLine(text);
  if (taskParsed) return taskParsed.indent.length;

  const listParsed = parseRegularListLine(text);
  if (listParsed) return listParsed.indent.length;

  return 0;
};

/**
 * Find nearest non-empty line in given direction and check if it's a heading.
 * This keeps the old behavior but moves repeated logic into a single helper.
 */
const nearestNonEmptyIsHeading = (doc: Text, start: number, step: 1 | -1): boolean => {
  for (let i = start; i >= 1 && i <= doc.lines; i += step) {
    const text = doc.line(i).text;
    if (!isEmptyLine(text)) return isHeadingLine(text);
  }
  return false;
};

const isEmptyLineAdjacentToHeading = (doc: Text, lineNumber: number): boolean => {
  // nearest non-empty above or below is a heading
  return nearestNonEmptyIsHeading(doc, lineNumber - 1, -1) || nearestNonEmptyIsHeading(doc, lineNumber + 1, 1);
};

/**
 * Returns [startLine, endLine] where endLine includes nested list children.
 */
const findTaskBlockWithChildren = (doc: Text, lineNumber: number): readonly [number, number] | undefined => {
  if (lineNumber < 1 || lineNumber > doc.lines) return undefined;

  const line = doc.line(lineNumber);
  if (!isListLine(line.text)) return undefined;

  const baseIndent = getIndentLevel(line.text);

  let lastValidLine = lineNumber;

  for (let i = lineNumber + 1; i <= doc.lines; i++) {
    const nextText = doc.line(i).text;

    if (isEmptyLine(nextText)) break;
    if (!isListLine(nextText)) break;

    const nextIndent = getIndentLevel(nextText);
    if (nextIndent <= baseIndent) break;

    lastValidLine = i;
  }

  return [lineNumber, lastValidLine] as const;
};

const findParentTask = (doc: Text, lineNumber: number): number | undefined => {
  if (lineNumber < 1 || lineNumber > doc.lines) return undefined;

  const lineText = doc.line(lineNumber).text;
  if (!isListLine(lineText)) return undefined;

  const currentIndent = getIndentLevel(lineText);
  if (currentIndent === 0) return undefined;

  for (let i = lineNumber - 1; i >= 1; i--) {
    const checkText = doc.line(i).text;

    if (isEmptyLine(checkText)) return undefined;

    if (isListLine(checkText)) {
      const checkIndent = getIndentLevel(checkText);
      if (checkIndent < currentIndent) return i;
    }
  }

  return undefined;
};

const findTarget = (
  doc: Text,
  startLine: number,
  currentIndent: number,
  parentLine: number | undefined,
  direction: "up" | "down",
  maxLine?: number,
): number | undefined => {
  if (direction === "up") {
    for (let i = startLine - 1; i >= 1; i--) {
      const text = doc.line(i).text;

      if (isEmptyLine(text)) {
        if (isEmptyLineAdjacentToHeading(doc, i)) continue;
        return undefined;
      }
      if (isHeadingLine(text)) continue;
      if (!isListLine(text)) continue;

      const checkIndent = getIndentLevel(text);

      if (parentLine !== undefined) {
        if (checkIndent === currentIndent) return i;
        if (checkIndent < currentIndent) return undefined;
      } else {
        if (checkIndent <= currentIndent) return i;
      }
    }

    return undefined;
  }

  // direction === "down"
  const upper = maxLine ?? doc.lines;
  for (let i = startLine + 1; i <= upper; i++) {
    const text = doc.line(i).text;

    if (isEmptyLine(text)) {
      if (isEmptyLineAdjacentToHeading(doc, i)) continue;
      return undefined;
    }
    if (isHeadingLine(text)) continue;
    if (!isListLine(text)) continue;

    const checkIndent = getIndentLevel(text);

    if (parentLine !== undefined) {
      if (checkIndent === currentIndent) return i;
      if (checkIndent < currentIndent) return undefined;
    } else {
      if (checkIndent <= currentIndent) return i;
    }
  }

  return undefined;
};

const getBlockContent = (doc: Text, startLine: number, endLine: number): BlockRange | undefined => {
  if (startLine < 1 || endLine > doc.lines) return undefined;
  const start = doc.line(startLine).from;
  const end = doc.line(endLine).to;
  return { start, end, content: doc.sliceString(start, end) };
};

const calculateNewCursorPosition = (
  cursorPos: number,
  currentLineStart: number,
  currentBlock: BlockRange,
  targetBlock: BlockRange,
  isMovingDown: boolean,
): number => {
  const cursorOffsetInLine = cursorPos - currentLineStart;
  const currentLineOffset = currentLineStart - currentBlock.start;

  if (isMovingDown) {
    const sizeDiff = targetBlock.content.length - currentBlock.content.length;
    return targetBlock.start + currentLineOffset + cursorOffsetInLine + sizeDiff;
  }

  return targetBlock.start + currentLineOffset + cursorOffsetInLine;
};

const swapBlocks = (
  view: EditorView,
  currentBlock: BlockRange,
  targetBlock: BlockRange,
  cursorPos: number,
  currentLineStart: number,
  userEvent: string,
): boolean => {
  const isMovingDown = currentBlock.start < targetBlock.start;
  const newCursorPos = calculateNewCursorPosition(cursorPos, currentLineStart, currentBlock, targetBlock, isMovingDown);

  const [first, second] = isMovingDown ? [currentBlock, targetBlock] : [targetBlock, currentBlock];

  view.dispatch({
    changes: [
      { from: first.start, to: first.end, insert: second.content },
      { from: second.start, to: second.end, insert: first.content },
    ],
    selection: { anchor: newCursorPos },
    userEvent,
  });

  return true;
};

const moveTask = (view: EditorView, direction: "up" | "down"): boolean => {
  const { state } = view;
  const { selection } = state;

  if (selection.ranges.length > 1) return false;

  const pos = selection.main.head;
  const line = state.doc.lineAt(pos);

  if (!isListLine(line.text)) return false;

  const blockRange = findTaskBlockWithChildren(state.doc, line.number);
  if (!blockRange) return false;

  const [blockStartLine, blockEndLine] = blockRange;
  const doc = state.doc;

  const currentBlock = getBlockContent(doc, blockStartLine, blockEndLine);
  if (!currentBlock) return false;

  const currentIndent = getIndentLevel(doc.line(blockStartLine).text);
  const parentLine = findParentTask(doc, line.number);

  const searchFromLine = direction === "up" ? line.number : blockEndLine;
  const maxLineForScope =
    parentLine !== undefined ? (findTaskBlockWithChildren(doc, parentLine)?.[1] ?? doc.lines) : doc.lines;

  const targetLine = findTarget(doc, searchFromLine, currentIndent, parentLine, direction, maxLineForScope);
  if (!targetLine) return false;

  const targetBlockRange = findTaskBlockWithChildren(doc, targetLine);
  if (!targetBlockRange) return false;

  const targetBlock = getBlockContent(doc, targetBlockRange[0], targetBlockRange[1]);
  if (!targetBlock) return false;

  const currentLineStart = line.from;
  return swapBlocks(view, currentBlock, targetBlock, pos, currentLineStart, `move.task.${direction}`);
};

const moveTaskWrapper =
  (direction: "up" | "down") =>
  (view: EditorView): boolean => {
    const { selection } = view.state;
    if (selection.ranges.length > 1) return false;

    const line = view.state.doc.lineAt(selection.main.head);
    if (!isListLine(line.text)) return false;

    // attempt move; regardless of success, suppress default behavior (same as original)
    void moveTask(view, direction);
    return true;
  };

export const moveTaskUp = moveTaskWrapper("up");
export const moveTaskDown = moveTaskWrapper("down");
