import { describe, it, expect } from "vitest";
import { isTaskListLine, isCheckedTask } from "./task-list-utils";

describe("Task List Utils", () => {
  it("should identify task list lines", () => {
    expect(isTaskListLine("- [ ] Task")).toBe(true);
    expect(isTaskListLine("- [x] Completed task")).toBe(true);
    expect(isTaskListLine("- [X] Completed task")).toBe(true);
    expect(isTaskListLine("* [ ] Task with asterisk")).toBe(true);
    expect(isTaskListLine("Regular text")).toBe(false);
    expect(isTaskListLine("- Regular list item")).toBe(false);
  });

  it("should identify checked tasks", () => {
    expect(isCheckedTask("- [x] Completed task")).toBe(true);
    expect(isCheckedTask("- [X] Completed task")).toBe(true);
    expect(isCheckedTask("* [x] Completed task with asterisk")).toBe(true);
    expect(isCheckedTask("- [ ] Incomplete task")).toBe(false);
    expect(isCheckedTask("Regular text")).toBe(false);
  });
});
