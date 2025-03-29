import { describe, it, expect } from "vitest";
import { isTaskLine, isClosedTaskLine } from "./task-list-utils";

describe("Task List Utilities", () => {
  describe("isTaskListLine", () => {
    it("identifies task list lines correctly", () => {
      expect(isTaskLine("- [ ] Task")).toBe(true);
      expect(isTaskLine("- [x] Task")).toBe(true);
      expect(isTaskLine("- [X] Task")).toBe(true);
      expect(isTaskLine("  - [ ] Indented task")).toBe(true);

      expect(isTaskLine("Not a task")).toBe(false);
      expect(isTaskLine("- Not a task")).toBe(false);
      expect(isTaskLine("* [ ] Wrong marker")).toBe(false);
    });
  });

  describe("isCheckedTask", () => {
    it("identifies checked tasks correctly", () => {
      expect(isClosedTaskLine("- [x] Task")).toBe(true);
      expect(isClosedTaskLine("- [X] Task")).toBe(true);
      expect(isClosedTaskLine("  - [x] Indented task")).toBe(true);

      expect(isClosedTaskLine("- [ ] Unchecked task")).toBe(false);
      expect(isClosedTaskLine("Not a task")).toBe(false);
    });
  });
});
