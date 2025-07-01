import type { EditorView } from "@codemirror/view";
import type { Text } from "@codemirror/state";
import { isTaskLine, isRegularListLine, parseTaskLine, parseRegularListLine } from "./task-list-utils";

const MARKDOWN_HEADING = /^#{1,6}\s+\S/;
const EMPTY_LINE = /^\s*$/u;

type LineRange = {
  startLine: number;
  endLine: number;
};

type BlockRange = {
  start: number;
  end: number;
  content: string;
};

type TaskBlock = readonly [number, number];

const isListLine = (text: string): boolean => isTaskLine(text) || isRegularListLine(text);

const isHeadingLine = (text: string): boolean => MARKDOWN_HEADING.test(text);

const isEmptyLine = (text: string): boolean => EMPTY_LINE.test(text);

const getIndentLevel = (text: string): number => {
  const taskParsed = parseTaskLine(text);
  if (taskParsed) return taskParsed.indent.length;

  const listParsed = parseRegularListLine(text);
  if (listParsed) return listParsed.indent.length;

  return 0;
};

const findSectionBoundaries = (doc: Text, lineNumber: number): LineRange => {
  const findSectionStart = (lineNum: number): number => {
    for (let i = lineNum - 1; i >= 1; i--) {
      if (isHeadingLine(doc.line(i).text)) {
        return i; // Include the heading line itself
      }
    }
    return 1;
  };

  const findSectionEnd = (lineNum: number): number => {
    for (let i = lineNum + 1; i <= doc.lines; i++) {
      if (isHeadingLine(doc.line(i).text)) {
        return i - 1;
      }
    }
    return doc.lines;
  };

  return {
    startLine: findSectionStart(lineNumber),
    endLine: findSectionEnd(lineNumber),
  };
};

const findTaskBlockWithChildren = (doc: Text, lineNumber: number): TaskBlock | undefined => {
  if (lineNumber < 1 || lineNumber > doc.lines) return undefined;

  const line = doc.line(lineNumber);
  if (!isListLine(line.text)) return undefined;

  const baseIndent = getIndentLevel(line.text);

  const findEndLine = (startLine: number): number => {
    let lastValidLine = startLine;

    for (let i = startLine + 1; i <= doc.lines; i++) {
      const nextLine = doc.line(i);

      if (isEmptyLine(nextLine.text)) break;
      if (!isListLine(nextLine.text)) break;

      const nextIndent = getIndentLevel(nextLine.text);
      if (nextIndent <= baseIndent) break;

      lastValidLine = i;
    }

    return lastValidLine;
  };

  return [lineNumber, findEndLine(lineNumber)] as const;
};

const findParentTask = (doc: Text, lineNumber: number): number | undefined => {
  if (lineNumber < 1 || lineNumber > doc.lines) return undefined;

  const line = doc.line(lineNumber);
  if (!isListLine(line.text)) return undefined;

  const currentIndent = getIndentLevel(line.text);
  if (currentIndent === 0) return undefined;

  for (let i = lineNumber - 1; i >= 1; i--) {
    const checkLine = doc.line(i);

    if (isEmptyLine(checkLine.text)) return undefined;

    if (isListLine(checkLine.text)) {
      const checkIndent = getIndentLevel(checkLine.text);
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
  const step = direction === "up" ? -1 : 1;
  const lowerBound = direction === "up" ? 1 : startLine + step;
  const upperBound = direction === "up" ? startLine - step : (maxLine ?? doc.lines);

  for (let i = startLine + step; direction === "up" ? i >= lowerBound : i <= upperBound; i += step) {
    const checkLine = doc.line(i);
    const text = checkLine.text;

    if (isEmptyLine(text) || isHeadingLine(text)) return undefined;
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
  // Step 1: Calculate cursor offset within the current line
  // Example: If cursor is at pos 25 and line starts at pos 20, offset is 5
  const cursorOffsetInLine = cursorPos - currentLineStart;

  // Step 2: Calculate the line's offset within its block
  // Example: If line starts at pos 20 and block starts at pos 10, line offset is 10
  const currentLineOffset = currentLineStart - currentBlock.start;

  // Step 3: Calculate new position based on movement direction
  if (isMovingDown) {
    // When moving down, the current block will be placed after the target block
    // We need to account for the size difference between blocks
    // Example: If target is longer, cursor needs to shift further
    const sizeDiff = targetBlock.content.length - currentBlock.content.length;
    return targetBlock.start + currentLineOffset + cursorOffsetInLine + sizeDiff;
  } else {
    // When moving up, the current block will be placed where the target block is
    // The cursor maintains its relative position within the moved block
    return targetBlock.start + currentLineOffset + cursorOffsetInLine;
  }
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

  // Calculate where the cursor should be after the swap
  const newCursorPos = calculateNewCursorPosition(cursorPos, currentLineStart, currentBlock, targetBlock, isMovingDown);

  // Always swap in document order to avoid position conflicts
  // This ensures the first change doesn't affect the position of the second
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

  // Early validation
  if (!isListLine(line.text)) return false;

  const blockRange = findTaskBlockWithChildren(state.doc, line.number);
  if (!blockRange) return false;

  const [blockStartLine, blockEndLine] = blockRange;
  const doc = state.doc;

  const currentBlock = getBlockContent(doc, blockStartLine, blockEndLine);
  if (!currentBlock) return false;

  const currentIndent = getIndentLevel(doc.line(blockStartLine).text);
  const parentLine = findParentTask(doc, line.number);

  // Find target based on direction
  const searchFromLine = direction === "up" ? line.number : blockEndLine;
  const maxLine = parentLine !== undefined ? (findTaskBlockWithChildren(doc, parentLine)?.[1] ?? doc.lines) : doc.lines;

  const targetLine = findTarget(doc, searchFromLine, currentIndent, parentLine, direction, maxLine);
  if (!targetLine) return false;

  // Validate section boundaries
  const currentSection = findSectionBoundaries(doc, line.number);
  if (targetLine < currentSection.startLine || targetLine > currentSection.endLine) return false;

  const targetBlockRange = findTaskBlockWithChildren(doc, targetLine);
  if (!targetBlockRange) return false;

  const targetBlock = getBlockContent(doc, targetBlockRange[0], targetBlockRange[1]);
  if (!targetBlock) return false;

  // Pass the current cursor position and line start for proper cursor positioning
  const currentLineStart = line.from;
  return swapBlocks(view, currentBlock, targetBlock, pos, currentLineStart, `move.task.${direction}`);
};

export const moveTaskUp = (view: EditorView): boolean => {
  const { state } = view;
  const { selection } = state;

  // Multiple selections - return false
  if (selection.ranges.length > 1) {
    return false;
  }

  // Check if we're on a task/list line
  const line = state.doc.lineAt(selection.main.head);
  if (isListLine(line.text)) {
    // Try to move the task
    moveTask(view, "up");
    // Always return true for task lines to prevent default behavior
    return true;
  }

  // Not on a task line, use default behavior
  return false;
};

export const moveTaskDown = (view: EditorView): boolean => {
  const { state } = view;
  const { selection } = state;

  // Multiple selections - return false
  if (selection.ranges.length > 1) {
    return false;
  }

  // Check if we're on a task/list line
  const line = state.doc.lineAt(selection.main.head);
  if (isListLine(line.text)) {
    // Try to move the task
    moveTask(view, "down");
    // Always return true for task lines to prevent default behavior
    return true;
  }

  // Not on a task line, use default behavior
  return false;
};
