import type { EditorView } from "@codemirror/view";

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

// Helper function to check if a line is a task
function isTaskLine(text: string): boolean {
  return /^\s*- \[([ x])\]/.test(text);
}

// Helper function to check if a line is a regular list item
function isRegularListLine(text: string): boolean {
  return /^\s*[-*+]\s(?!\[([ x])\])/.test(text);
}

// Helper function to check if a line is any list item (task or regular)
function isListLine(text: string): boolean {
  return isTaskLine(text) || isRegularListLine(text);
}

// Helper function to check if a line is a heading
function isHeadingLine(text: string): boolean {
  return /^#+\s/.test(text);
}

// Helper function to check if a line is empty
function isEmptyLine(text: string): boolean {
  return text.trim() === "";
}

// Helper function to get the indentation level of a line
function getIndentLevel(text: string): number {
  const match = text.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

/**
 * Find the section boundaries for a given line
 * A section is defined by headings or document boundaries
 */
function findSectionBoundaries(doc: any, lineNumber: number): { startLine: number, endLine: number } {
  let sectionStartLine = 1;
  let sectionEndLine = doc.lines;
  
  // Search backwards for section start (heading or document start)
  for (let i = lineNumber - 1; i >= 1; i--) {
    const line = doc.line(i);
    if (isHeadingLine(line.text)) {
      sectionStartLine = i + 1; // Section starts after the heading
      break;
    }
  }
  
  // Search forwards for section end (next heading or document end)
  for (let i = lineNumber + 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    if (isHeadingLine(line.text)) {
      sectionEndLine = i - 1; // Section ends before the next heading
      break;
    }
  }
  
  return { startLine: sectionStartLine, endLine: sectionEndLine };
}

/**
 * Find the complete task block including all nested children
 * Returns [startLine, endLine] inclusive or null if not a task
 */
function findTaskBlockWithChildren(doc: any, lineNumber: number): [number, number] | null {
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
}

/**
 * Find the parent task of a given line
 * Returns the line number of the parent or null if no parent
 */
function findParentTask(doc: any, lineNumber: number): number | null {
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
}

/**
 * Check if moving a task block up is allowed
 */
function canMoveTaskUp(view: EditorView, lineNumber: number): boolean {
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
  
  // Find the target position (previous task at same or lower indent level)
  let targetLine: number | null = null;
  
  // If this is a child task, it can only swap with siblings at the same level
  const parentLine = findParentTask(doc, lineNumber);
  
  for (let i = lineNumber - 1; i >= 1; i--) {
    const checkLine = doc.line(i);
    
    // Stop at empty lines
    if (isEmptyLine(checkLine.text)) {
      return false; // Would cross empty line
    }
    
    // Stop at headings
    if (isHeadingLine(checkLine.text)) {
      return false; // Would cross section boundary
    }
    
    if (isListLine(checkLine.text)) {
      const checkIndent = getIndentLevel(checkLine.text);
      
      // For child tasks, only consider siblings at exact same indent
      if (parentLine !== null) {
        if (checkIndent === currentIndent) {
          targetLine = i;
          break;
        } else if (checkIndent < currentIndent) {
          // Hit parent or higher level, stop
          return false;
        }
      } else {
        // For top-level tasks, can swap with tasks at same or lower indent
        if (checkIndent <= currentIndent) {
          targetLine = i;
          break;
        }
      }
    }
  }
  
  if (!targetLine) return false;
  
  // Check if target is in same section
  const targetSection = findSectionBoundaries(doc, targetLine);
  if (currentSection.startLine !== targetSection.startLine || 
      currentSection.endLine !== targetSection.endLine) {
    return false;
  }
  
  // Rule 3: Check nesting integrity - already handled in the loop above
  
  return true;
}

/**
 * Check if moving a task block down is allowed
 */
function canMoveTaskDown(view: EditorView, lineNumber: number): boolean {
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
  
  // Check what's immediately below the block
  const nextLine = doc.line(blockEndLine + 1);
  
  // Rule 1: Cannot move across empty lines
  if (isEmptyLine(nextLine.text)) {
    return false;
  }
  
  // Rule 2: Cannot move across headings
  if (isHeadingLine(nextLine.text)) {
    return false;
  }
  
  // Find the target position (next task at same or lower indent level)
  let targetLine: number | null = null;
  
  // If this is a child task, check parent boundaries first
  const parentLine = findParentTask(doc, lineNumber);
  let maxLine = doc.lines;
  
  if (parentLine !== null) {
    // Find parent's block end to limit search
    const parentBlock = findTaskBlockWithChildren(doc, parentLine);
    if (parentBlock) {
      maxLine = parentBlock[1];
    }
  }
  
  for (let i = blockEndLine + 1; i <= maxLine; i++) {
    const checkLine = doc.line(i);
    
    // Stop at empty lines
    if (isEmptyLine(checkLine.text)) {
      return false; // Would cross empty line
    }
    
    // Stop at headings
    if (isHeadingLine(checkLine.text)) {
      return false; // Would cross section boundary
    }
    
    if (isListLine(checkLine.text)) {
      const checkIndent = getIndentLevel(checkLine.text);
      
      // For child tasks, only consider siblings at exact same indent
      if (parentLine !== null) {
        if (checkIndent === currentIndent) {
          targetLine = i;
          break;
        } else if (checkIndent < currentIndent) {
          // Hit parent boundary or higher level
          return false;
        }
      } else {
        // For top-level tasks
        if (checkIndent <= currentIndent) {
          targetLine = i;
          break;
        }
      }
    }
  }
  
  if (!targetLine) return false;
  
  // Check if target is in same section
  const targetSection = findSectionBoundaries(doc, targetLine);
  if (currentSection.startLine !== targetSection.startLine || 
      currentSection.endLine !== targetSection.endLine) {
    return false;
  }
  
  // Rule 3: Check nesting integrity - already handled above in the parent boundary check
  
  return true;
}

/**
 * Move a task up with all its children
 */
export function moveTaskUp(view: EditorView): boolean {
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
  const blockStart = doc.line(blockStartLine).from;
  const blockEnd = doc.line(blockEndLine).to;
  const blockContent = doc.sliceString(blockStart, blockEnd);
  
  // Find the target task to swap with
  const currentIndent = getIndentLevel(doc.line(blockStartLine).text);
  let targetLine: number | null = null;
  
  for (let i = blockStartLine - 1; i >= 1; i--) {
    const checkLine = doc.line(i);
    if (isListLine(checkLine.text)) {
      const checkIndent = getIndentLevel(checkLine.text);
      if (checkIndent <= currentIndent) {
        targetLine = i;
        break;
      }
    }
  }
  
  if (!targetLine) return false;
  
  // Get target block range
  const targetBlockRange = findTaskBlockWithChildren(doc, targetLine);
  if (!targetBlockRange) return false;
  
  const [targetStartLine, targetEndLine] = targetBlockRange;
  const targetBlockStart = doc.line(targetStartLine).from;
  const targetBlockEnd = doc.line(targetEndLine).to;
  const targetBlockContent = doc.sliceString(targetBlockStart, targetBlockEnd);
  
  // Calculate cursor position in the block
  const cursorOffsetInBlock = pos - blockStart;
  
  // Perform the swap
  view.dispatch({
    changes: [
      { from: blockStart, to: blockEnd, insert: targetBlockContent },
      { from: targetBlockStart, to: targetBlockEnd, insert: blockContent }
    ],
    selection: { anchor: targetBlockStart + cursorOffsetInBlock },
    userEvent: "move.task.up"
  });
  
  return true;
}

/**
 * Move a task down with all its children
 */
export function moveTaskDown(view: EditorView): boolean {
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
  const blockStart = doc.line(blockStartLine).from;
  const blockEnd = doc.line(blockEndLine).to;
  const blockContent = doc.sliceString(blockStart, blockEnd);
  
  // Find the target task to swap with
  const currentIndent = getIndentLevel(doc.line(blockStartLine).text);
  let targetLine: number | null = null;
  let targetEndLine: number | null = null;
  
  for (let i = blockEndLine + 1; i <= doc.lines; i++) {
    const checkLine = doc.line(i);
    if (isListLine(checkLine.text)) {
      const checkIndent = getIndentLevel(checkLine.text);
      if (checkIndent <= currentIndent) {
        targetLine = i;
        const targetBlockRange = findTaskBlockWithChildren(doc, i);
        if (targetBlockRange) {
          targetEndLine = targetBlockRange[1];
        }
        break;
      }
    }
  }
  
  if (!targetLine || !targetEndLine) return false;
  
  // Get target block content
  const targetBlockStart = doc.line(targetLine).from;
  const targetBlockEnd = doc.line(targetEndLine).to;
  const targetBlockContent = doc.sliceString(targetBlockStart, targetBlockEnd);
  
  // Calculate cursor position in the block
  const cursorOffsetInBlock = pos - blockStart;
  
  // Calculate the new position after the swap
  // The current block will move to where the target block is
  // Since target is below current, we need to account for the size difference
  const currentBlockSize = blockEnd - blockStart;
  const targetBlockSize = targetBlockEnd - targetBlockStart;
  const newBlockStart = targetBlockStart + (targetBlockSize - currentBlockSize);
  
  // Perform the swap
  view.dispatch({
    changes: [
      { from: blockStart, to: blockEnd, insert: targetBlockContent },
      { from: targetBlockStart, to: targetBlockEnd, insert: blockContent }
    ],
    selection: { anchor: newBlockStart + cursorOffsetInBlock },
    userEvent: "move.task.down"
  });
  
  return true;
}