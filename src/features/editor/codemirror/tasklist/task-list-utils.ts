// hit to `- [ ]` or `- [x]` or `- [X]` or `* [ ]` or `* [x]` or `* [X]`
const TASK_LINE_REGEX = /^(\s*)[-*] \[\s*([xX ])\s*\]/;
// hit to `- [ ]` or `* [ ]`
const OPEN_TASK_LINE_REGEX = /^(\s*)[-*] \[\s* \s*\]/;
// hit to `- [x]` or `- [X]` or `* [x]` or `* [X]`
const CLOSED_TASK_LINE_REGEX = /^(\s*)[-*] \[\s*[xX]\s*\]/;
// hit to `- [ ]` or `- [x]` or `- [X]` or `* [ ]` or `* [x]` or `* [X]` but ends with `\s*`
const TASK_LINE_ENDS_WITH_SPACE_REGEX = /^(\s*[-*]\s+\[[ xX]\])\s*$/;

/**
 * Checks if a line contains a task list item
 * - [ ] or - [x] or - [X] or * [ ] or * [x] or * [X]
 */
export const isTaskLine = (lineContent: string): boolean => {
  return !!lineContent.match(TASK_LINE_REGEX);
};

/**
 * Checks if a line contains an open task
 * - [ ] or * [ ]
 */
export const isOpenTaskLine = (lineContent: string): boolean => {
  return !!lineContent.match(OPEN_TASK_LINE_REGEX);
};

/**
 * Checks if a line contains a checked task
 * - [x] or - [X] or * [x] or * [X]
 */
export const isClosedTaskLine = (lineContent: string): boolean => {
  return !!lineContent.match(CLOSED_TASK_LINE_REGEX);
};

/**
 * Checks if a line contains a task list item that ends with a space
 * - [ ] or - [x] or - [X] or * [ ] or * [x] or * [X]
 */
export const isTaskLineEndsWithSpace = (lineContent: string): boolean => {
  return !!lineContent.match(TASK_LINE_ENDS_WITH_SPACE_REGEX);
};
