import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { taskAgingPlugin, registerTaskCreation } from "./task-aging";

describe("Task Aging", () => {
  it("should register new tasks when created", () => {
    const taskContent = "Test task";
    registerTaskCreation(taskContent);

    // Task should be registered (we can't directly test the Map but we can test the function doesn't throw)
    expect(() => registerTaskCreation(taskContent)).not.toThrow();
  });

  it("should create editor with task aging plugin", () => {
    const state = EditorState.create({
      doc: "- [ ] New task\n- [x] Completed task",
      extensions: [taskAgingPlugin],
    });

    expect(state).toBeDefined();
    expect(state.doc.toString()).toBe("- [ ] New task\n- [x] Completed task");
  });
});
