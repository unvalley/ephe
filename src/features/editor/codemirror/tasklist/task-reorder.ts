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
        return i + 1;
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
  maxLine?: number
): number | undefined => {
  const step = direction === "up" ? -1 : 1;
  const limit = direction === "up" ? 1 : (maxLine ?? doc.lines);
  
  for (let i = startLine + step; direction === "up" ? i >= limit : i <= limit; i += step) {
    const checkLine = doc.line(i);
    
    if (isEmptyLine(checkLine.text)) return undefined;
    if (isHeadingLine(checkLine.text)) return undefined;
    
    if (!isListLine(checkLine.text)) continue;
    
    const checkIndent = getIndentLevel(checkLine.text);
    
    if (parentLine !== undefined) {
      if (checkIndent === currentIndent) return i;
      if (checkIndent < currentIndent) return undefined;
    } else {
      if (checkIndent <= currentIndent) return i;
    }
  }
  
  return undefined;
};

const canMoveTaskUp = (view: EditorView, lineNumber: number): boolean => {
  if (lineNumber === 1) return false;
  
  const doc = view.state.doc;
  if (lineNumber < 1 || lineNumber > doc.lines) return false;
  
  const line = doc.line(lineNumber);
  if (!isListLine(line.text)) return false;
  
  const prevLine = doc.line(lineNumber - 1);
  if (isEmptyLine(prevLine.text)) return false;
  if (isHeadingLine(prevLine.text)) return false;
  
  const currentIndent = getIndentLevel(line.text);
  const parentLine = findParentTask(doc, lineNumber);
  const targetLine = findTarget(doc, lineNumber, currentIndent, parentLine, "up");
  
  if (targetLine === undefined) return false;
  
  // Optimize: call findSectionBoundaries only once
  const currentSection = findSectionBoundaries(doc, lineNumber);
  return targetLine >= currentSection.startLine && targetLine <= currentSection.endLine;
};

const canMoveTaskDown = (view: EditorView, lineNumber: number): boolean => {
  const doc = view.state.doc;
  if (lineNumber < 1 || lineNumber > doc.lines) return false;
  
  const line = doc.line(lineNumber);
  if (!isListLine(line.text)) return false;
  
  const blockRange = findTaskBlockWithChildren(doc, lineNumber);
  if (blockRange === undefined) return false;
  
  const [, blockEndLine] = blockRange;
  
  if (blockEndLine >= doc.lines) return false;
  
  const nextLine = doc.line(blockEndLine + 1);
  if (isEmptyLine(nextLine.text)) return false;
  if (isHeadingLine(nextLine.text)) return false;
  
  const currentIndent = getIndentLevel(line.text);
  const parentLine = findParentTask(doc, lineNumber);
  
  const maxLine = parentLine !== undefined
    ? findTaskBlockWithChildren(doc, parentLine)?.[1] ?? doc.lines
    : doc.lines;
  
  const targetLine = findTarget(doc, blockEndLine, currentIndent, parentLine, "down", maxLine);
  
  if (targetLine === undefined) return false;
  
  // Optimize: call findSectionBoundaries only once
  const currentSection = findSectionBoundaries(doc, lineNumber);
  return targetLine >= currentSection.startLine && targetLine <= currentSection.endLine;
};

const getBlockContent = (doc: Text, startLine: number, endLine: number): BlockRange | undefined => {
  if (startLine < 1 || startLine > doc.lines || endLine < 1 || endLine > doc.lines) {
    return undefined;
  }
  
  const start = doc.line(startLine).from;
  const end = doc.line(endLine).to;
  const content = doc.sliceString(start, end);
  
  return { start, end, content };
};

const swapBlocks = (
  view: EditorView,
  currentBlock: BlockRange,
  targetBlock: BlockRange,
  cursorOffset: number,
  userEvent: string
): boolean => {
  try {
    // Ensure changes are in ascending order of 'from' positions
    const changes = currentBlock.start < targetBlock.start
      ? [
          { from: currentBlock.start, to: currentBlock.end, insert: targetBlock.content },
          { from: targetBlock.start, to: targetBlock.end, insert: currentBlock.content }
        ]
      : [
          { from: targetBlock.start, to: targetBlock.end, insert: currentBlock.content },
          { from: currentBlock.start, to: currentBlock.end, insert: targetBlock.content }
        ];
    
    // Calculate new cursor position: target block's start + offset
    // CodeMirror automatically adjusts offsets when applying changes
    const newCursorPos = targetBlock.start + cursorOffset;
    
    view.dispatch({
      changes,
      selection: { anchor: newCursorPos },
      userEvent
    });
    return true;
  } catch {
    return false;
  }
};

export const moveTaskUp = (view: EditorView): boolean => {
  const { state } = view;
  const { selection } = state;
  
  if (selection.ranges.length > 1) return false;
  
  const pos = selection.main.head;
  const line = state.doc.lineAt(pos);
  
  if (!canMoveTaskUp(view, line.number)) return false;
  
  const blockRange = findTaskBlockWithChildren(state.doc, line.number);
  if (blockRange === undefined) return false;
  
  const [blockStartLine, blockEndLine] = blockRange;
  const doc = state.doc;
  
  const currentBlock = getBlockContent(doc, blockStartLine, blockEndLine);
  if (!currentBlock) return false;
  
  const currentIndent = getIndentLevel(doc.line(blockStartLine).text);
  const parentLine = findParentTask(doc, line.number);
  const targetLine = findTarget(doc, line.number, currentIndent, parentLine, "up");
  
  if (targetLine === undefined) return false;
  
  const targetBlockRange = findTaskBlockWithChildren(doc, targetLine);
  if (targetBlockRange === undefined) return false;
  
  const [targetStartLine, targetEndLine] = targetBlockRange;
  const targetBlock = getBlockContent(doc, targetStartLine, targetEndLine);
  if (!targetBlock) return false;
  
  const cursorOffsetInBlock = Math.max(0, pos - currentBlock.start);
  
  return swapBlocks(view, currentBlock, targetBlock, cursorOffsetInBlock, "move.task.up");
};

export const moveTaskDown = (view: EditorView): boolean => {
  const { state } = view;
  const { selection } = state;
  
  if (selection.ranges.length > 1) return false;
  
  const pos = selection.main.head;
  const line = state.doc.lineAt(pos);
  
  if (!canMoveTaskDown(view, line.number)) return false;
  
  const blockRange = findTaskBlockWithChildren(state.doc, line.number);
  if (blockRange === undefined) return false;
  
  const [blockStartLine, blockEndLine] = blockRange;
  const doc = state.doc;
  
  const currentBlock = getBlockContent(doc, blockStartLine, blockEndLine);
  if (!currentBlock) return false;
  
  const currentIndent = getIndentLevel(doc.line(blockStartLine).text);
  const parentLine = findParentTask(doc, line.number);
  
  const maxLine = parentLine !== undefined
    ? findTaskBlockWithChildren(doc, parentLine)?.[1] ?? doc.lines
    : doc.lines;
  
  const targetLine = findTarget(doc, blockEndLine, currentIndent, parentLine, "down", maxLine);
  
  if (targetLine === undefined) return false;
  
  const targetBlockRange = findTaskBlockWithChildren(doc, targetLine);
  if (targetBlockRange === undefined) return false;
  
  const targetBlock = getBlockContent(doc, targetBlockRange[0], targetBlockRange[1]);
  if (!targetBlock) return false;
  
  const cursorOffsetInBlock = Math.max(0, pos - currentBlock.start);
  
  return swapBlocks(view, currentBlock, targetBlock, cursorOffsetInBlock, "move.task.down");
};