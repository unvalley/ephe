import { isTaskLine, isClosedTaskLine } from './parser';

/**
 * Toggle the completion state of a task
 * - [ ] → - [x]
 * - [x] → - [ ]
 */
export const toggleTaskCompletion = (line: string): string => {
  if (!isTaskLine(line)) return line;
  
  if (isClosedTaskLine(line)) {
    // Replace [x] or [X] with [ ]
    return line.replace(/\[\s*[xX]\s*\]/, '[ ]');
  } else {
    // Replace [ ] with [x]
    return line.replace(/\[\s*\]/, '[x]');
  }
};

/**
 * Convert a regular list item to a task list item
 * - item → - [ ] item
 */
export const convertToTaskList = (line: string): string => {
  const match = line.match(/^(\s*)([-*+])\s+(.*)$/);
  if (!match) return line;
  
  const [, indent, bullet, content] = match;
  return `${indent}${bullet === '+' ? '-' : bullet} [ ] ${content}`;
};

/**
 * Get the indentation level of a line (number of spaces)
 */
export const getIndentLevel = (line: string): number => {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
};

/**
 * Create a new task line with the given indentation
 */
export const createNewTaskLine = (indent: string, bullet: string = '-'): string => {
  return `${indent}${bullet} [ ] `;
};