import type { EditorView } from "@codemirror/view";
import type { Text } from "@codemirror/state";

/**
 * BULLETPROOF Markdown Task Reorder System
 * 
 * Core Rules:
 * 1. Tasks cannot move across empty lines
 * 2. Tasks cannot move across section boundaries (headings)
 * 3. Nested tasks maintain their parent-child relationships
 * 4. Parent tasks move with all their children as a unit
 * 5. Child tasks cannot move outside their parent's scope
 */

// ===== Constants =====
const REGEX = {
  TASK_LINE: /^\s*- \[([ x])\]/,
  REGULAR_LIST_LINE: /^\s*[-*+]\s(?!\[([ x])\])/,
  HEADING_LINE: /^#+\s/,
  LEADING_WHITESPACE: /^(\s*)/,
} as const;

// ===== Type Definitions =====
type LineRange = {
  startLine: number;
  endLine: number;
};

type BlockRange = {
  start: number;
  end: number;
  content: string;
};

// ===== Line Type Checkers =====
const isTaskLine = (text: string): boolean => {
  return REGEX.TASK_LINE.test(text);
};

const isRegularListLine = (text: string): boolean => {
  return REGEX.REGULAR_LIST_LINE.test(text);
};

const isListLine = (text: string): boolean => {
  return isTaskLine(text) || isRegularListLine(text);
};

const isHeadingLine = (text: string): boolean => {
  return REGEX.HEADING_LINE.test(text);
};

const isEmptyLine = (text: string): boolean => {
  return text.trim() === "";
};

// ===== Utility Functions =====
const getIndentLevel = (text: string): number => {
  const match = text.match(REGEX.LEADING_WHITESPACE);
  return match ? match[1].length : 0;
};

// ===== Section Management =====
/**
 * Find the section boundaries for a given line
 * A section is defined by headings or document boundaries
 */
const findSectionBoundaries = (doc: Text, lineNumber: number): LineRange => {
  let startLine = 1;
  let endLine = doc.lines;
  
  // Search backwards for section start (heading or document start)
  for (let i = lineNumber - 1; i >= 1; i--) {
    const line = doc.line(i);
    if (isHeadingLine(line.text)) {
      startLine = i + 1; // Section starts after the heading
      break;
    }
  }
  
  // Search forwards for section end (next heading or document end)
  for (let i = lineNumber + 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    if (isHeadingLine(line.text)) {
      endLine = i - 1; // Section ends before the next heading
      break;
    }
  }
  
  return { startLine, endLine };
};

// ===== Task Block Management =====
/**
 * Find the complete task block including all nested children
 * Returns [startLine, endLine] inclusive or null if not a task
 */
const findTaskBlockWithChildren = (doc: Text, lineNumber: number): [number, number] | null => {
  const line = doc.line(lineNumber);
  
  if (!isListLine(line.text)) {
    return null;
  }
  
  const baseIndent = getIndentLevel(line.text);
  let endLine = lineNumber;
  
  // Look forward for all children (more indented items)
  for (let i = lineNumber + 1; i <= doc.lines; i++) {
    const nextLine = doc.line(i);
    
    // Stop at empty lines
    if (isEmptyLine(nextLine.text)) {
      break;
    }
    
    // Stop at non-list lines
    if (!isListLine(nextLine.text)) {
      break;
    }
    
    const nextIndent = getIndentLevel(nextLine.text);
    
    // Stop at items with same or less indentation
    if (nextIndent <= baseIndent) {
      break;
    }
    
    // This is a child, include it
    endLine = i;
  }
  
  return [lineNumber, endLine];
};

/**
 * Find the parent task of a given line
 * Returns the line number of the parent or null if no parent
 */
const findParentTask = (doc: Text, lineNumber: number): number | null => {
  const line = doc.line(lineNumber);
  if (!isListLine(line.text)) return null;
  
  const currentIndent = getIndentLevel(line.text);
  if (currentIndent === 0) return null; // Top-level tasks have no parent
  
  // Search backwards for a task with less indentation
  for (let i = lineNumber - 1; i >= 1; i--) {
    const checkLine = doc.line(i);
    
    // Stop at empty lines
    if (isEmptyLine(checkLine.text)) {
      return null;
    }
    
    if (isListLine(checkLine.text)) {
      const checkIndent = getIndentLevel(checkLine.text);
      if (checkIndent < currentIndent) {
        return i; // Found the parent
      }
    }
  }
  
  return null;
};

// ===== Movement Target Finding =====
/**
 * Find a valid target line for moving up
 */
const findUpwardTarget = (
  doc: Text,
  lineNumber: number,
  currentIndent: number,
  parentLine: number | null
): number | null => {
  for (let i = lineNumber - 1; i >= 1; i--) {
    const checkLine = doc.line(i);
    
    // Stop at empty lines
    if (isEmptyLine(checkLine.text)) {
      return null; // Would cross empty line
    }
    
    // Stop at headings
    if (isHeadingLine(checkLine.text)) {
      return null; // Would cross section boundary
    }
    
    if (isListLine(checkLine.text)) {
      const checkIndent = getIndentLevel(checkLine.text);
      
      // For child tasks, only consider siblings at exact same indent
      if (parentLine !== null) {
        if (checkIndent === currentIndent) {
          return i;
        } else if (checkIndent < currentIndent) {
          // Hit parent or higher level, stop
          return null;
        }
      } else {
        // For top-level tasks, can swap with tasks at same or lower indent
        if (checkIndent <= currentIndent) {
          return i;
        }
      }
    }
  }
  
  return null;
};

/**
 * Find a valid target line for moving down
 */
const findDownwardTarget = (
  doc: Text,
  blockEndLine: number,
  currentIndent: number,
  parentLine: number | null,
  maxLine: number
): number | null => {
  for (let i = blockEndLine + 1; i <= maxLine; i++) {
    const checkLine = doc.line(i);
    
    // Stop at empty lines
    if (isEmptyLine(checkLine.text)) {
      return null; // Would cross empty line
    }
    
    // Stop at headings
    if (isHeadingLine(checkLine.text)) {
      return null; // Would cross section boundary
    }
    
    if (isListLine(checkLine.text)) {
      const checkIndent = getIndentLevel(checkLine.text);
      
      // For child tasks, only consider siblings at exact same indent
      if (parentLine !== null) {
        if (checkIndent === currentIndent) {
          return i;
        } else if (checkIndent < currentIndent) {
          // Hit parent boundary or higher level
          return null;
        }
      } else {
        // For top-level tasks
        if (checkIndent <= currentIndent) {
          return i;
        }
      }
    }
  }
  
  return null;
};

// ===== Movement Validation =====
/**
 * Check if moving a task block up is allowed
 */
const canMoveTaskUp = (view: EditorView, lineNumber: number): boolean => {
  const doc = view.state.doc;
  const line = doc.line(lineNumber);
  
  // Must be a list line
  if (!isListLine(line.text)) return false;
  
  // Can't move first line up
  if (lineNumber === 1) return false;
  
  // Get current task's properties
  const currentIndent = getIndentLevel(line.text);
  const currentSection = findSectionBoundaries(doc, lineNumber);
  
  // Check what's immediately above
  const prevLine = doc.line(lineNumber - 1);
  
  // Rule 1: Cannot move across empty lines
  if (isEmptyLine(prevLine.text)) {
    return false;
  }
  
  // Rule 2: Cannot move across headings
  if (isHeadingLine(prevLine.text)) {
    return false;
  }
  
  // Find the target position
  const parentLine = findParentTask(doc, lineNumber);
  const targetLine = findUpwardTarget(doc, lineNumber, currentIndent, parentLine);
  
  if (!targetLine) return false;
  
  // Check if target is in same section
  const targetSection = findSectionBoundaries(doc, targetLine);
  if (currentSection.startLine !== targetSection.startLine || 
      currentSection.endLine !== targetSection.endLine) {
    return false;
  }
  
  return true;
};

/**
 * Check if moving a task block down is allowed
 */
const canMoveTaskDown = (view: EditorView, lineNumber: number): boolean => {
  const doc = view.state.doc;
  const line = doc.line(lineNumber);
  
  // Must be a list line
  if (!isListLine(line.text)) return false;
  
  // Get the complete block with children
  const blockRange = findTaskBlockWithChildren(doc, lineNumber);
  if (!blockRange) return false;
  
  const [, blockEndLine] = blockRange;
  
  // Can't move last line down
  if (blockEndLine >= doc.lines) return false;
  
  // Get current task's properties
  const currentIndent = getIndentLevel(line.text);
  const currentSection = findSectionBoundaries(doc, lineNumber);
  
  // Check if there's any line below
  if (blockEndLine + 1 > doc.lines) return false;
  
  const nextLine = doc.line(blockEndLine + 1);
  
  // Rule 1: Cannot move across empty lines
  if (isEmptyLine(nextLine.text)) {
    return false;
  }
  
  // Rule 2: Cannot move across headings
  if (isHeadingLine(nextLine.text)) {
    return false;
  }
  
  // Determine search boundary based on parent
  const parentLine = findParentTask(doc, lineNumber);
  let maxLine = doc.lines;
  
  if (parentLine !== null) {
    // Find parent's block end to limit search
    const parentBlock = findTaskBlockWithChildren(doc, parentLine);
    if (parentBlock) {
      maxLine = parentBlock[1];
    }
  }
  
  // Find the target position
  const targetLine = findDownwardTarget(doc, blockEndLine, currentIndent, parentLine, maxLine);
  
  if (!targetLine) return false;
  
  // Check if target is in same section
  const targetSection = findSectionBoundaries(doc, targetLine);
  if (currentSection.startLine !== targetSection.startLine || 
      currentSection.endLine !== targetSection.endLine) {
    return false;
  }
  
  return true;
};

// ===== Block Content Extraction =====
/**
 * Get the content of a block as a range object
 */
const getBlockContent = (doc: Text, startLine: number, endLine: number): BlockRange => {
  const start = doc.line(startLine).from;
  const end = doc.line(endLine).to;
  const content = doc.sliceString(start, end);
  return { start, end, content };
};

// ===== Main Movement Functions =====
/**
 * Move a task up with all its children
 */
export const moveTaskUp = (view: EditorView): boolean => {
  const { state } = view;
  const { selection } = state;
  
  // Only handle single cursor
  if (selection.ranges.length > 1) return false;
  
  const pos = selection.main.head;
  const line = state.doc.lineAt(pos);
  
  if (!canMoveTaskUp(view, line.number)) return false;
  
  const blockRange = findTaskBlockWithChildren(state.doc, line.number);
  if (!blockRange) return false;
  
  const [blockStartLine, blockEndLine] = blockRange;
  const doc = state.doc;
  
  // Get the content of the block to move
  const currentBlock = getBlockContent(doc, blockStartLine, blockEndLine);
  
  // Find the target task to swap with
  const currentIndent = getIndentLevel(doc.line(blockStartLine).text);
  const parentLine = findParentTask(doc, line.number);
  const targetLine = findUpwardTarget(doc, line.number, currentIndent, parentLine);
  
  if (!targetLine) return false;
  
  // Get target block range
  const targetBlockRange = findTaskBlockWithChildren(doc, targetLine);
  if (!targetBlockRange) return false;
  
  const [targetStartLine, targetEndLine] = targetBlockRange;
  const targetBlock = getBlockContent(doc, targetStartLine, targetEndLine);
  
  // Calculate cursor position in the block
  const cursorOffsetInBlock = pos - currentBlock.start;
  
  // Perform the swap
  view.dispatch({
    changes: [
      { from: currentBlock.start, to: currentBlock.end, insert: targetBlock.content },
      { from: targetBlock.start, to: targetBlock.end, insert: currentBlock.content }
    ],
    selection: { anchor: targetBlock.start + cursorOffsetInBlock },
    userEvent: "move.task.up"
  });
  
  return true;
};

/**
 * Move a task down with all its children
 */
export const moveTaskDown = (view: EditorView): boolean => {
  const { state } = view;
  const { selection } = state;
  
  // Only handle single cursor
  if (selection.ranges.length > 1) return false;
  
  const pos = selection.main.head;
  const line = state.doc.lineAt(pos);
  
  if (!canMoveTaskDown(view, line.number)) return false;
  
  const blockRange = findTaskBlockWithChildren(state.doc, line.number);
  if (!blockRange) return false;
  
  const [blockStartLine, blockEndLine] = blockRange;
  const doc = state.doc;
  
  // Get the content of the block to move
  const currentBlock = getBlockContent(doc, blockStartLine, blockEndLine);
  
  // Find the target task to swap with
  const currentIndent = getIndentLevel(doc.line(blockStartLine).text);
  const parentLine = findParentTask(doc, line.number);
  
  // Determine search boundary
  let maxLine = doc.lines;
  if (parentLine !== null) {
    const parentBlock = findTaskBlockWithChildren(doc, parentLine);
    if (parentBlock) {
      maxLine = parentBlock[1];
    }
  }
  
  const targetLine = findDownwardTarget(doc, blockEndLine, currentIndent, parentLine, maxLine);
  
  if (!targetLine) return false;
  
  // Get target block
  const targetBlockRange = findTaskBlockWithChildren(doc, targetLine);
  if (!targetBlockRange) return false;
  
  const targetBlock = getBlockContent(doc, targetBlockRange[0], targetBlockRange[1]);
  
  // Calculate cursor position in the block
  const cursorOffsetInBlock = pos - currentBlock.start;
  
  // Calculate the new position after the swap
  const newBlockStart = targetBlock.start + (targetBlock.end - targetBlock.start - (currentBlock.end - currentBlock.start));
  
  // Perform the swap
  view.dispatch({
    changes: [
      { from: currentBlock.start, to: currentBlock.end, insert: targetBlock.content },
      { from: targetBlock.start, to: targetBlock.end, insert: currentBlock.content }
    ],
    selection: { anchor: newBlockStart + cursorOffsetInBlock },
    userEvent: "move.task.down"
  });
  
  return true;
};