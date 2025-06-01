// hit to `- [ ]` or `- [x]` or `- [X]` or `* [ ]` or `* [x]` or `* [X]`
const TASK_LINE_REGEX = /^(\s*)[-*] \[\s*([xX ])\s*\]/;
// hit to `- [ ]` or `* [ ]`
const OPEN_TASK_LINE_REGEX = /^(\s*)[-*] \[\s* \s*\]/;
// hit to `- [x]` or `- [X]` or `* [x]` or `* [X]`
const CLOSED_TASK_LINE_REGEX = /^(\s*)[-*] \[\s*[xX]\s*\]/;
// hit to `- [ ]` or `- [x]` or `- [X]` or `* [ ]` or `* [x]` or `* [X]` but ends with `\s*`
const TASK_LINE_ENDS_WITH_SPACE_REGEX = /^(\s*[-*]\s+\[[ xX]\])\s*$/;

// Regular list patterns (non-task lists)
// hit to `- item` or `* item` or `+ item`
const REGULAR_LIST_REGEX = /^(\s*)([-*+])\s+(.*)$/;
// hit to `- ` or `* ` or `+ ` (empty list items)
const EMPTY_LIST_REGEX = /^(\s*)([-*+])\s*$/;

/**
 * Checks if a line contains a task list item
 * - [ ] or - [x] or - [X] or * [ ] or * [x] or * [X]
 */
export const isTaskLine = (lineContent: string): boolean => {
  return !!lineContent.match(TASK_LINE_REGEX);
};

/**
 * Checks if a line contains a regular list item (non-task)
 * - item or * item or + item
 */
export const isRegularListLine = (lineContent: string): boolean => {
  const taskMatch = lineContent.match(TASK_LINE_REGEX);
  if (taskMatch) return false; // Task lines are not regular list lines

  return !!lineContent.match(REGULAR_LIST_REGEX);
};

/**
 * Checks if a line is an empty regular list item
 * - or * or + (with optional trailing spaces)
 */
export const isEmptyListLine = (lineContent: string): boolean => {
  return !!lineContent.match(EMPTY_LIST_REGEX);
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

/**
 * Extracts task line components (indent, bullet) from a task line
 * Returns null if not a task line
 */
export const parseTaskLine = (lineContent: string): { indent: string; bullet: string } | null => {
  const match = lineContent.match(TASK_LINE_REGEX);
  if (!match) return null;
  return {
    indent: match[1],
    bullet: match[0].includes("*") ? "*" : "-",
  };
};

/**
 * Extracts empty list line components (indent, bullet) from an empty list line
 * Returns null if not an empty list line
 */
export const parseEmptyListLine = (lineContent: string): { indent: string; bullet: string } | null => {
  const match = lineContent.match(EMPTY_LIST_REGEX);
  if (!match) return null;
  return {
    indent: match[1],
    bullet: match[2],
  };
};

/**
 * Extracts regular list line components (indent, bullet, content) from a regular list line
 * Returns null if not a regular list line
 */
export const parseRegularListLine = (
  lineContent: string,
): { indent: string; bullet: string; content: string } | null => {
  const match = lineContent.match(REGULAR_LIST_REGEX);
  if (!match) return null;
  return {
    indent: match[1],
    bullet: match[2],
    content: match[3],
  };
};
