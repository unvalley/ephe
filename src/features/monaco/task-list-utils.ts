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
