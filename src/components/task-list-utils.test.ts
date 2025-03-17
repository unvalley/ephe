import { describe, it, expect } from "vitest";
import {
  isTaskListLine,
  isCheckedTask,
  isEmptyTaskListLine,
  getTaskListIndentation,
  getCheckboxEndPosition,
} from "./task-list-utils";

describe("Task List Utilities", () => {
  describe("isTaskListLine", () => {
    it("identifies task list lines correctly", () => {
      expect(isTaskListLine("- [ ] Task")).toBe(true);
      expect(isTaskListLine("- [x] Task")).toBe(true);
      expect(isTaskListLine("- [X] Task")).toBe(true);
      expect(isTaskListLine("  - [ ] Indented task")).toBe(true);

      expect(isTaskListLine("Not a task")).toBe(false);
      expect(isTaskListLine("- Not a task")).toBe(false);
      expect(isTaskListLine("* [ ] Wrong marker")).toBe(false);
    });
  });

  describe("isCheckedTask", () => {
    it("identifies checked tasks correctly", () => {
      expect(isCheckedTask("- [x] Task")).toBe(true);
      expect(isCheckedTask("- [X] Task")).toBe(true);
      expect(isCheckedTask("  - [x] Indented task")).toBe(true);

      expect(isCheckedTask("- [ ] Unchecked task")).toBe(false);
      expect(isCheckedTask("Not a task")).toBe(false);
    });
  });

  describe("isEmptyTaskListLine", () => {
    it("identifies empty task list lines correctly", () => {
      expect(isEmptyTaskListLine("- [ ] ")).toBe(true);
      expect(isEmptyTaskListLine("- [x] ")).toBe(true);

      expect(isEmptyTaskListLine("- [ ] Task")).toBe(false);
      expect(isEmptyTaskListLine("  - [ ] ")).toBe(false); // Has indentation
    });
  });

  describe("getTaskListIndentation", () => {
    it("gets the correct indentation", () => {
      expect(getTaskListIndentation("- [ ] Task")).toBe("");
      expect(getTaskListIndentation("  - [ ] Task")).toBe("  ");
      expect(getTaskListIndentation("\t- [ ] Task")).toBe("\t");

      expect(getTaskListIndentation("Not a task")).toBe("");
    });
  });

  describe("getCheckboxEndPosition", () => {
    it("gets the correct checkbox end position", () => {
      expect(getCheckboxEndPosition("- [ ] Task")).toBe(5);
      expect(getCheckboxEndPosition("  - [ ] Task")).toBe(7);

      // If no checkbox, returns -1 + 1 = 0
      expect(getCheckboxEndPosition("Not a task")).toBe(0);
    });
  });
});
