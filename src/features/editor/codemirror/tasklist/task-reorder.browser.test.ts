import { describe, expect, test, vi } from "vitest";
import { EditorState, EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { moveTaskUp, moveTaskDown } from "./task-reorder";

// Helper to create an editor state with content
function createEditorState(doc: string, cursorPos?: number) {
  return EditorState.create({
    doc,
    selection: cursorPos !== undefined ? EditorSelection.single(cursorPos) : undefined,
  });
}

// Helper to create a mock editor view
function createMockView(initialState: EditorState) {
  let currentState = initialState;

  const view = {
    get state() {
      return currentState;
    },
    dispatch: vi.fn((transaction: any) => {
      // Apply changes to get new state
      if (transaction.changes) {
        currentState = currentState.update(transaction).state;
      }
    }),
  } as unknown as EditorView;

  return view;
}

describe("Task Reorder - Empty Line Separation", () => {
  test("cannot move task up across empty line", () => {
    const doc = `- [ ] Task A

- [ ] Task B
- [ ] Task C`;

    const state = createEditorState(doc, 14); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("cannot move task down across empty line", () => {
    const doc = `- [ ] Task A
- [ ] Task B

- [ ] Task C`;

    const state = createEditorState(doc, 13); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("tasks separated by multiple empty lines cannot swap", () => {
    const doc = `- [ ] Task A


- [ ] Task B`;

    const state = createEditorState(doc, 16); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });
});

describe("Task Reorder - Section Boundaries", () => {
  test("cannot move task up across heading", () => {
    const doc = `# Section 1
- [ ] Task A

# Section 2
- [ ] Task B`;

    const state = createEditorState(doc, 40); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("cannot move task down across heading", () => {
    const doc = `# Section 1
- [ ] Task A
- [ ] Task B

# Section 2
- [ ] Task C`;

    const state = createEditorState(doc, 25); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("tasks can move within same section", () => {
    const doc = `# Section 1
- [ ] Task A
- [ ] Task B
- [ ] Task C`;

    const state = createEditorState(doc, 25); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`# Section 1
- [ ] Task B
- [ ] Task A
- [ ] Task C`);
  });

  test("respects different heading levels", () => {
    const doc = `# Main Section
## Subsection 1
- [ ] Task A

## Subsection 2
- [ ] Task B`;

    const state = createEditorState(doc, 50); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });
});

describe("Task Reorder - Nesting Integrity", () => {
  test("parent task moves with all children", () => {
    const doc = `- [ ] Parent A
  - [ ] Child A1
  - [ ] Child A2
- [ ] Parent B`;

    const state = createEditorState(doc, 0); // Cursor on Parent A
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- [ ] Parent B
- [ ] Parent A
  - [ ] Child A1
  - [ ] Child A2`);
  });

  test("child cannot move above parent", () => {
    const doc = `- [ ] Parent A
  - [ ] Child A1
  - [ ] Child A2`;

    const state = createEditorState(doc, 17); // Cursor on Child A1
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("child cannot move outside parent scope", () => {
    const doc = `- [ ] Parent A
  - [ ] Child A1
  - [ ] Child A2
- [ ] Parent B`;

    const state = createEditorState(doc, 34); // Cursor on Child A2
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("siblings at same indent level can swap", () => {
    const doc = `- [ ] Parent A
  - [ ] Child A1
  - [ ] Child A2
  - [ ] Child A3`;

    const state = createEditorState(doc, 34); // Cursor on Child A2
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- [ ] Parent A
  - [ ] Child A1
  - [ ] Child A3
  - [ ] Child A2`);
  });

  test("deeply nested tasks maintain hierarchy", () => {
    const doc = `- [ ] Level 1
  - [ ] Level 2
    - [ ] Level 3A
    - [ ] Level 3B`;

    const state = createEditorState(doc, 48); // Cursor on Level 3A
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- [ ] Level 1
  - [ ] Level 2
    - [ ] Level 3B
    - [ ] Level 3A`);
  });

  test("parent with nested children moves as unit", () => {
    const doc = `- [ ] Task A
- [ ] Task B
  - [ ] Child B1
    - [ ] Grandchild B1.1
  - [ ] Child B2
- [ ] Task C`;

    const state = createEditorState(doc, 13); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- [ ] Task A
- [ ] Task C
- [ ] Task B
  - [ ] Child B1
    - [ ] Grandchild B1.1
  - [ ] Child B2`);
  });
});

describe("Task Reorder - Mixed Content", () => {
  test("cannot move task across non-task content", () => {
    const doc = `- [ ] Task A
Some paragraph text
- [ ] Task B`;

    const state = createEditorState(doc, 32); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("regular list items can move same as tasks", () => {
    const doc = `- Regular item A
- Regular item B
- [ ] Task C`;

    const state = createEditorState(doc, 17); // Cursor on Regular item B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- Regular item B
- Regular item A
- [ ] Task C`);
  });

  test("tasks and regular lists can swap", () => {
    const doc = `- [ ] Task A
- Regular item B`;

    const state = createEditorState(doc, 0); // Cursor on Task A
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- Regular item B
- [ ] Task A`);
  });
});

describe("Task Reorder - Edge Cases", () => {
  test("first line cannot move up", () => {
    const doc = `- [ ] First Task
- [ ] Second Task`;

    const state = createEditorState(doc, 0); // Cursor on first task
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("last line cannot move down", () => {
    const doc = `- [ ] First Task
- [ ] Last Task`;

    const state = createEditorState(doc, 17); // Cursor on last task
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("non-task lines cannot be moved", () => {
    const doc = `- [ ] Task A
Regular text line
- [ ] Task B`;

    const state = createEditorState(doc, 13); // Cursor on regular text
    const view = createMockView(state);

    const resultUp = moveTaskUp(view);
    const resultDown = moveTaskDown(view);

    expect(resultUp).toBe(false);
    expect(resultDown).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("handles multiple selections by ignoring", () => {
    const doc = `- [ ] Task A
- [ ] Task B`;

    const state = EditorState.create({
      doc,
      selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(13)]),
    });
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("preserves cursor position within moved task", () => {
    const doc = `- [ ] Task A
- [ ] Task B with longer text`;

    const state = createEditorState(doc, 20); // Cursor in middle of Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();

    // Check cursor position was preserved
    const call = (view.dispatch as any).mock.calls[0][0];
    expect(call.selection).toBeDefined();
    expect(call.selection.anchor).toBe(7); // Same offset in moved task
  });

  test("handles tasks at different indent levels correctly", () => {
    const doc = `- [ ] Task A
  - [ ] Subtask A1
    - [ ] Sub-subtask A1.1
- [ ] Task B
  - [ ] Subtask B1`;

    const state = createEditorState(doc, 0); // Cursor on Task A
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- [ ] Task B
  - [ ] Subtask B1
- [ ] Task A
  - [ ] Subtask A1
    - [ ] Sub-subtask A1.1`);
  });
});

describe("Task Reorder - Complex Scenarios", () => {
  test("respects all rules in complex document", () => {
    const doc = `# Project Tasks

## High Priority
- [ ] Task 1
  - [ ] Subtask 1.1
  - [ ] Subtask 1.2

- [ ] Task 2

## Low Priority
- [ ] Task 3
  - [ ] Subtask 3.1

Regular paragraph text here.

- [ ] Task 4`;

    // Try to move Task 2 up (should fail - empty line)
    let state = createEditorState(doc, 88); // Cursor on Task 2
    let view = createMockView(state);
    let result = moveTaskUp(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();

    // Try to move Task 3 up (should fail - heading)
    state = createEditorState(doc, 118); // Cursor on Task 3
    view = createMockView(state);
    result = moveTaskUp(view);
    expect(result).toBe(false);

    // Try to move Task 4 up (should fail - paragraph)
    state = createEditorState(doc, 182); // Cursor on Task 4
    view = createMockView(state);
    result = moveTaskUp(view);
    expect(result).toBe(false);

    // Try to move Subtask 1.1 down (should succeed)
    state = createEditorState(doc, 47); // Cursor on Subtask 1.1
    view = createMockView(state);
    result = moveTaskDown(view);
    expect(result).toBe(true);

    const newDoc = view.state.doc.toString();
    const expected = doc.replace(
      "  - [ ] Subtask 1.1\n  - [ ] Subtask 1.2",
      "  - [ ] Subtask 1.2\n  - [ ] Subtask 1.1",
    );
    expect(newDoc).toBe(expected);
  });

  test("edge case: task at end of section cannot move into next section", () => {
    const doc = `# Section 1
- [ ] Task A
- [ ] Task B

# Section 2
Some text`;

    const state = createEditorState(doc, 25); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("edge case: orphaned child tasks block parent movement", () => {
    const doc = `- [ ] Parent A
  - [ ] Child A1
- [ ] Parent B
  - [ ] Child B1
- [ ] Parent C`;

    // Child A1 cannot move down past Parent B
    const state = createEditorState(doc, 17); // Cursor on Child A1
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });
});

describe("Task Reorder - Newline Preservation", () => {
  test("preserves newlines when swapping tasks", () => {
    const doc = `- [ ] A
- [ ] B
- [ ] C`;

    const state = createEditorState(doc, 10); // Cursor on B
    const view = createMockView(state);

    moveTaskUp(view);

    const result = view.state.doc.toString();
    expect(result).toBe(`- [ ] B
- [ ] A
- [ ] C`);

    // Check that each line is separate
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("- [ ] B");
    expect(lines[1]).toBe("- [ ] A");
    expect(lines[2]).toBe("- [ ] C");

    // Ensure no concatenation
    expect(result).not.toContain("- [ ] B- [ ] A");
  });
});
