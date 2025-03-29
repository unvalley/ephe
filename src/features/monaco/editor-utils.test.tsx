import { describe, it, expect } from "vitest";
import { isTaskLine, isClosedTaskLine } from "./task-list-utils";

describe("Task List Utils", () => {
  it("should identify task list lines", () => {
    expect(isTaskLine("- [ ] Task")).toBe(true);
    expect(isTaskLine("- [x] Completed task")).toBe(true);
    expect(isTaskLine("- [X] Completed task")).toBe(true);
    expect(isTaskLine("* [ ] Task with asterisk")).toBe(true);
    expect(isTaskLine("Regular text")).toBe(false);
    expect(isTaskLine("- Regular list item")).toBe(false);
  });

  it("should identify checked tasks", () => {
    expect(isClosedTaskLine("- [x] Completed task")).toBe(true);
    expect(isClosedTaskLine("- [X] Completed task")).toBe(true);
    expect(isClosedTaskLine("* [x] Completed task with asterisk")).toBe(true);
    expect(isClosedTaskLine("- [ ] Incomplete task")).toBe(false);
    expect(isClosedTaskLine("Regular text")).toBe(false);
  });
});
