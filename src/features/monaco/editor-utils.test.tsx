import { describe, it, expect, vi } from "vitest";
import {
  isTaskListLine,
  isCheckedTask,
  handleTaskCheckboxToggle,
  applyTaskCheckboxDecorations,
} from "./task-list-utils";

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

  it("should toggle task checkbox state", () => {
    // モックエディタの作成
    const mockEditor = {
      getModel: vi.fn().mockReturnValue({
        getLineContent: vi.fn().mockImplementation((lineNumber) => {
          if (lineNumber === 1) return "- [ ] Task 1";
          if (lineNumber === 2) return "- [x] Task 2";
          return "";
        }),
        getValueInRange: vi.fn().mockImplementation(({ startLineNumber }) => {
          if (startLineNumber === 1) return "- [ ] Task 1";
          if (startLineNumber === 2) return "- [x] Task 2";
          return "";
        }),
        modifyPosition: vi.fn().mockReturnValue({ lineNumber: 1, column: 1 }),
        getPositionAt: vi.fn().mockReturnValue({ lineNumber: 1, column: 1 }),
      }),
      executeEdits: vi.fn(),
    };

    // 未完了タスクを完了に変更
    handleTaskCheckboxToggle(mockEditor as any, 1);
    expect(mockEditor.executeEdits).toHaveBeenCalledWith("toggle-checkbox", [
      { range: expect.any(Object), text: "- [x] Task 1" },
    ]);

    // 完了タスクを未完了に変更
    handleTaskCheckboxToggle(mockEditor as any, 2);
    expect(mockEditor.executeEdits).toHaveBeenCalledWith("toggle-checkbox", [
      { range: expect.any(Object), text: "- [ ] Task 2" },
    ]);
  });
});
