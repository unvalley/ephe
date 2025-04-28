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

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  describe("isTaskLine", () => {
    it("identifies task list lines correctly", () => {
      expect(isTaskLine("- [ ] Task")).toBe(true);
      expect(isTaskLine("- [x] Task")).toBe(true);
      expect(isTaskLine("- [X] Task")).toBe(true);
      expect(isTaskLine("  - [ ] Indented task")).toBe(true);
      expect(isTaskLine("* [ ] Task")).toBe(true);
      expect(isTaskLine("* [x] Task")).toBe(true);
      expect(isTaskLine("* [X] Task")).toBe(true);

      expect(isTaskLine("Not a task")).toBe(false);
      expect(isTaskLine("- Not a task")).toBe(false);
    });
  });

  describe("isClosedTaskLine", () => {
    it("identifies closed tasks correctly", () => {
      expect(isClosedTaskLine("- [x] Task")).toBe(true);
      expect(isClosedTaskLine("- [X] Task")).toBe(true);
      expect(isClosedTaskLine("  - [x] Indented task")).toBe(true);
      expect(isClosedTaskLine("* [x] Task")).toBe(true);
      expect(isClosedTaskLine("* [X] Task")).toBe(true);

      expect(isClosedTaskLine("- [ ] Unchecked task")).toBe(false);
      expect(isClosedTaskLine("Not a task")).toBe(false);
    });
  });

  describe("isOpenTaskLine", () => {
    it("identifies open tasks correctly", () => {
      expect(isOpenTaskLine("- [ ] Task")).toBe(true);
      expect(isOpenTaskLine("  - [ ] Indented task")).toBe(true);
      expect(isOpenTaskLine("* [ ] Task")).toBe(true);

      expect(isOpenTaskLine("- [x] Checked task")).toBe(false);
      expect(isOpenTaskLine("- [X] Checked task")).toBe(false);
      expect(isOpenTaskLine("Not a task")).toBe(false);
    });
  });
}
