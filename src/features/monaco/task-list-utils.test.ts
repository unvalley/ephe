import { describe, it, expect } from "vitest";
import {
  isTaskListLine,
  isCheckedTask,
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
});
