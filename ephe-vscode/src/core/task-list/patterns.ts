// Task list regex patterns shared between web and VS Code
export const TASK_LINE_REGEX = /^(\s*)[-*] \[\s*([xX ])\s*\]/;
export const OPEN_TASK_LINE_REGEX = /^(\s*)[-*] \[\s* \s*\]/;
export const CLOSED_TASK_LINE_REGEX = /^(\s*)[-*] \[\s*[xX]\s*\]/;
export const TASK_LINE_ENDS_WITH_SPACE_REGEX = /^(\s*[-*]\s+\[[ xX]\])\s*$/;

// Regular list patterns (non-task lists)
export const REGULAR_LIST_REGEX = /^(\s*)([-*+])\s+(.*)$/;
export const EMPTY_LIST_REGEX = /^(\s*)([-*+])\s*$/;