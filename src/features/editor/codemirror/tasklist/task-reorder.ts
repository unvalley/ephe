import type { EditorView } from "@codemirror/view";
import type { Text } from "@codemirror/state";

const REGEX = {
  TASK_LINE: /^\s*- \[([ x])\]/,
  REGULAR_LIST_LINE: /^\s*[-*+]\s(?!\[([ x])\])/,
  HEADING_LINE: /^#+\s/,
  LEADING_WHITESPACE: /^(\s*)/,
} as const;

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

const isTaskLine = (text: string): boolean => REGEX.TASK_LINE.test(text);

const isRegularListLine = (text: string): boolean => REGEX.REGULAR_LIST_LINE.test(text);

const isListLine = (text: string): boolean => isTaskLine(text) || isRegularListLine(text);

const isHeadingLine = (text: string): boolean => REGEX.HEADING_LINE.test(text);

const isEmptyLine = (text: string): boolean => text.trim() === "";

const getIndentLevel = (text: string): number => {
  const match = text.match(REGEX.LEADING_WHITESPACE);
  return match?.[1].length ?? 0;
};

const isValidLineNumber = (doc: Text, lineNumber: number): boolean => {
  return lineNumber >= 1 && lineNumber <= doc.lines;
};

const findSectionBoundaries = (doc: Text, lineNumber: number): LineRange => {
  const findSectionStart = (lineNum: number): number => {
    for (let i = lineNum - 1; i >= 1; i--) {
      if (!isValidLineNumber(doc, i)) continue;
      
      if (isHeadingLine(doc.line(i).text)) {
        return i + 1;
      }
    }
    return 1;
  };

  const findSectionEnd = (lineNum: number): number => {
    for (let i = lineNum + 1; i <= doc.lines; i++) {
      if (!isValidLineNumber(doc, i)) continue;
      
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
  if (!isValidLineNumber(doc, lineNumber)) return undefined;
  
  const line = doc.line(lineNumber);
  if (!isListLine(line.text)) return undefined;

  const baseIndent = getIndentLevel(line.text);
  
  const findEndLine = (startLine: number): number => {
    let lastValidLine = startLine;
    
    for (let i = startLine + 1; i <= doc.lines; i++) {
      if (!isValidLineNumber(doc, i)) break;
      
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
  if (!isValidLineNumber(doc, lineNumber)) return undefined;
  
  const line = doc.line(lineNumber);
  if (!isListLine(line.text)) return undefined;
  
  const currentIndent = getIndentLevel(line.text);
  if (currentIndent === 0) return undefined;
  
  for (let i = lineNumber - 1; i >= 1; i--) {
    if (!isValidLineNumber(doc, i)) continue;
    
    const checkLine = doc.line(i);
    
    if (isEmptyLine(checkLine.text)) return undefined;
    
    if (isListLine(checkLine.text)) {
      const checkIndent = getIndentLevel(checkLine.text);
      if (checkIndent < currentIndent) return i;
    }
  }
  
  return undefined;
};

const findUpwardTarget = (
  doc: Text,
  lineNumber: number,
  currentIndent: number,
  parentLine: number | undefined
): number | undefined => {
  for (let i = lineNumber - 1; i >= 1; i--) {
    if (!isValidLineNumber(doc, i)) continue;
    
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

const findDownwardTarget = (
  doc: Text,
  blockEndLine: number,
  currentIndent: number,
  parentLine: number | undefined,
  maxLine: number
): number | undefined => {
  for (let i = blockEndLine + 1; i <= maxLine; i++) {
    if (!isValidLineNumber(doc, i)) continue;
    
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
  if (!isValidLineNumber(doc, lineNumber)) return false;
  
  const line = doc.line(lineNumber);
  if (!isListLine(line.text)) return false;
  
  if (!isValidLineNumber(doc, lineNumber - 1)) return false;
  const prevLine = doc.line(lineNumber - 1);
  
  if (isEmptyLine(prevLine.text)) return false;
  if (isHeadingLine(prevLine.text)) return false;
  
  const currentIndent = getIndentLevel(line.text);
  const parentLine = findParentTask(doc, lineNumber);
  const targetLine = findUpwardTarget(doc, lineNumber, currentIndent, parentLine);
  
  if (targetLine === undefined) return false;
  
  const currentSection = findSectionBoundaries(doc, lineNumber);
  const targetSection = findSectionBoundaries(doc, targetLine);
  
  return currentSection.startLine === targetSection.startLine && 
         currentSection.endLine === targetSection.endLine;
};

const canMoveTaskDown = (view: EditorView, lineNumber: number): boolean => {
  const doc = view.state.doc;
  if (!isValidLineNumber(doc, lineNumber)) return false;
  
  const line = doc.line(lineNumber);
  if (!isListLine(line.text)) return false;
  
  const blockRange = findTaskBlockWithChildren(doc, lineNumber);
  if (blockRange === undefined) return false;
  
  const [, blockEndLine] = blockRange;
  
  if (blockEndLine >= doc.lines) return false;
  if (!isValidLineNumber(doc, blockEndLine + 1)) return false;
  
  const nextLine = doc.line(blockEndLine + 1);
  
  if (isEmptyLine(nextLine.text)) return false;
  if (isHeadingLine(nextLine.text)) return false;
  
  const currentIndent = getIndentLevel(line.text);
  const parentLine = findParentTask(doc, lineNumber);
  
  const maxLine = parentLine !== undefined
    ? findTaskBlockWithChildren(doc, parentLine)?.[1] ?? doc.lines
    : doc.lines;
  
  const targetLine = findDownwardTarget(doc, blockEndLine, currentIndent, parentLine, maxLine);
  
  if (targetLine === undefined) return false;
  
  const currentSection = findSectionBoundaries(doc, lineNumber);
  const targetSection = findSectionBoundaries(doc, targetLine);
  
  return currentSection.startLine === targetSection.startLine && 
         currentSection.endLine === targetSection.endLine;
};

const getBlockContent = (doc: Text, startLine: number, endLine: number): BlockRange | undefined => {
  if (!isValidLineNumber(doc, startLine) || !isValidLineNumber(doc, endLine)) {
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
    // Calculate the new cursor position after the swap
    // When swapping blocks, CodeMirror applies changes sequentially, which affects positions
    // We need to account for how the first change affects the position of the second block
    let newCursorPos: number;
    if (currentBlock.start < targetBlock.start) {
      // Moving down: after the first change, the document length changes by the size difference
      // The cursor should be placed at the start of where the target block was,
      // adjusted for the size of the replacement
      const targetSize = targetBlock.end - targetBlock.start;
      newCursorPos = currentBlock.start + targetSize + cursorOffset;
    } else {
      // Moving up: current block goes to where target was
      newCursorPos = targetBlock.start + cursorOffset;
    }
    
    const changes = [
      { from: currentBlock.start, to: currentBlock.end, insert: targetBlock.content },
      { from: targetBlock.start, to: targetBlock.end, insert: currentBlock.content }
    ];
    
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
  const targetLine = findUpwardTarget(doc, line.number, currentIndent, parentLine);
  
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
  
  const targetLine = findDownwardTarget(doc, blockEndLine, currentIndent, parentLine, maxLine);
  
  if (targetLine === undefined) return false;
  
  const targetBlockRange = findTaskBlockWithChildren(doc, targetLine);
  if (targetBlockRange === undefined) return false;
  
  const targetBlock = getBlockContent(doc, targetBlockRange[0], targetBlockRange[1]);
  if (!targetBlock) return false;
  
  const cursorOffsetInBlock = Math.max(0, pos - currentBlock.start);
  
  return swapBlocks(view, currentBlock, targetBlock, cursorOffsetInBlock, "move.task.down");
};