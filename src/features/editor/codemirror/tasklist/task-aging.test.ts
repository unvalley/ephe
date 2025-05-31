import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { registerTaskCreation, taskAgingPlugin } from "./task-aging";

describe("Task Aging", () => {
  it("should register new tasks when created", () => {
    // Test with the new persistent key format (indentLevel:content)
    const taskKey = "0:Test task";
    registerTaskCreation(taskKey);

    // Task should be registered (we can't directly test the Map but we can test the function doesn't throw)
    expect(() => registerTaskCreation(taskKey)).not.toThrow();
  });

  it("should create editor with task aging plugin", () => {
    const state = EditorState.create({
      doc: "- [ ] New task\n- [x] Completed task",
      extensions: [taskAgingPlugin],
    });

    expect(state).toBeDefined();
    expect(state.doc.toString()).toBe("- [ ] New task\n- [x] Completed task");
  });

  it("should handle nested tasks", () => {
    const state = EditorState.create({
      doc: "- [ ] Parent task\n  - [ ] Child task\n  - [ ] Another child",
      extensions: [taskAgingPlugin],
    });

    expect(state).toBeDefined();
    expect(state.doc.toString()).toBe("- [ ] Parent task\n  - [ ] Child task\n  - [ ] Another child");
  });
});
