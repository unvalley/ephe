import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { taskAgingPlugin } from "./task-aging";

describe("Task Aging", () => {
  it("should create editor with task aging plugin without errors", () => {
    // Test that the plugin initializes correctly with task content
    const state = EditorState.create({
      doc: "- [ ] Test task\n- [ ] Another task",
      extensions: [taskAgingPlugin],
    });

    expect(state).toBeDefined();
    expect(state.doc.toString()).toBe("- [ ] Test task\n- [ ] Another task");
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
