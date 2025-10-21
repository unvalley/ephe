import {
  TASK_LINE_REGEX,
  OPEN_TASK_LINE_REGEX,
  CLOSED_TASK_LINE_REGEX,
  TASK_LINE_ENDS_WITH_SPACE_REGEX,
  REGULAR_LIST_REGEX,
  EMPTY_LIST_REGEX,
} from './patterns';

/**
 * Checks if a line contains a task list item
 * - [ ] or - [x] or - [X] or * [ ] or * [x] or * [X]
 */
export const isTaskLine = (lineContent: string): boolean => {
  return TASK_LINE_REGEX.test(lineContent);
};

/**
 * Checks if a line contains a regular list item (non-task)
 * - item or * item or + item
 */
export const isRegularListLine = (lineContent: string): boolean => {
  if (isTaskLine(lineContent)) return false;
  return REGULAR_LIST_REGEX.test(lineContent);
};

/**
 * Checks if a line is an empty regular list item
 * - or * or + (with optional trailing spaces)
 */
export const isEmptyListLine = (lineContent: string): boolean => {
  return EMPTY_LIST_REGEX.test(lineContent);
};

/**
 * Checks if a line contains an open task
 * - [ ] or * [ ]
 */
export const isOpenTaskLine = (lineContent: string): boolean => {
  return OPEN_TASK_LINE_REGEX.test(lineContent);
};

/**
 * Checks if a line contains a checked task
 * - [x] or - [X] or * [x] or * [X]
 */
export const isClosedTaskLine = (lineContent: string): boolean => {
  return CLOSED_TASK_LINE_REGEX.test(lineContent);
};

/**
 * Checks if a line contains a task list item that ends with a space
 * - [ ] or - [x] or - [X] or * [ ] or * [x] or * [X]
 */
export const isTaskLineEndsWithSpace = (lineContent: string): boolean => {
  return TASK_LINE_ENDS_WITH_SPACE_REGEX.test(lineContent);
};

type TaskLineInfo = {
  indent: string;
  bullet: string;
};

type RegularListLineInfo = TaskLineInfo & {
  content: string;
};

/**
 * Extracts task line components (indent, bullet) from a task line
 * Returns null if not a task line
 */
export const parseTaskLine = (lineContent: string): TaskLineInfo | null => {
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
export const parseEmptyListLine = (lineContent: string): TaskLineInfo | null => {
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
export const parseRegularListLine = (lineContent: string): RegularListLineInfo | null => {
  const match = lineContent.match(REGULAR_LIST_REGEX);
  if (!match) return null;
  return {
    indent: match[1],
    bullet: match[2],
    content: match[3],
  };
};