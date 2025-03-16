/**
 * Checks if a line contains a task list item
 */
export const isTaskListLine = (lineContent: string): boolean => {
  return !!lineContent.match(/^(\s*)- \[\s*([xX ])\s*\]/);
};

/**
 * Checks if a line contains a checked task
 */
export const isCheckedTask = (lineContent: string): boolean => {
  return !!lineContent.match(/^(\s*)- \[\s*[xX]\s*\]/);
};

/**
 * Checks if a line contains only a task list marker with no content
 */
export const isEmptyTaskListLine = (lineContent: string): boolean => {
  return !!lineContent.match(/^- \[\s*([xX ])\s*\]\s*$/);
};

/**
 * Gets the indentation of a task list line
 */
export const getTaskListIndentation = (lineContent: string): string => {
  const match = lineContent.match(/^(\s*)- \[\s*([xX ])\s*\]/);
  return match ? match[1] || '' : '';
};

/**
 * Gets the position of the end of the checkbox in a task list line
 */
export const getCheckboxEndPosition = (lineContent: string): number => {
  return lineContent.indexOf(']') + 1;
}; 