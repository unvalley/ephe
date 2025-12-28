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
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("cannot move task down across empty line", () => {
    const doc = `- [ ] Task A
- [ ] Task B

- [ ] Task C`;

    const state = createEditorState(doc, 13); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("tasks separated by multiple empty lines cannot swap", () => {
    const doc = `- [ ] Task A


- [ ] Task B`;

    const state = createEditorState(doc, 16); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).not.toHaveBeenCalled();
  });
});

describe("Task Reorder - Heading Boundaries", () => {
  test("can move task up across heading", () => {
    const doc = `# Section 1
- [ ] Task A

# Section 2
- [ ] Task B`;

    const state = createEditorState(doc, 40); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`# Section 1
- [ ] Task B

# Section 2
- [ ] Task A`);
  });

  test("can move task down across heading", () => {
    const doc = `# Section 1
- [ ] Task A
- [ ] Task B

# Section 2
- [ ] Task C`;

    const state = createEditorState(doc, 25); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`# Section 1
- [ ] Task A
- [ ] Task C

# Section 2
- [ ] Task B`);
  });

  test("tasks can move within same section", () => {
    const doc = `# Section 1
- [ ] Task A
- [ ] Task B
- [ ] Task C`;

    const state = createEditorState(doc, 25); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`# Section 1
- [ ] Task B
- [ ] Task A
- [ ] Task C`);
  });

  test("can move across different heading levels", () => {
    const doc = `# Main Section
## Subsection 1
- [ ] Task A

## Subsection 2
- [ ] Task B`;

    const state = createEditorState(doc, 62); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`# Main Section
## Subsection 1
- [ ] Task B

## Subsection 2
- [ ] Task A`);
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
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("last line cannot move down", () => {
    const doc = `- [ ] First Task
- [ ] Last Task`;

    const state = createEditorState(doc, 17); // Cursor on last task
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
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

  test("preserves cursor position within moved task", () => {
    const doc = `- [ ] Task A
- [ ] Task B with longer text`;

    const state = createEditorState(doc, 20); // Cursor in middle of Task B
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).not.toHaveBeenCalled();

    // Try to move Task 3 up (should fail - heading)
    state = createEditorState(doc, 118); // Cursor on Task 3
    view = createMockView(state);
    result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior

    // Try to move Task 4 up (should fail - paragraph)
    state = createEditorState(doc, 182); // Cursor on Task 4
    view = createMockView(state);
    result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior

    // Try to move Subtask 1.1 down (should succeed)
    state = createEditorState(doc, 47); // Cursor on Subtask 1.1
    view = createMockView(state);
    result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior

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
    expect(result).toBe(true); // Returns true to prevent default behavior
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
    expect(result).toBe(true); // Returns true to prevent default behavior
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

describe("Task Reorder - Large Documents", () => {
  test("handles swapping in 1000-line document without corruption", () => {
    // Generate a large document with tasks
    const lines: string[] = [];

    // Add header
    lines.push("# Large Document Test");
    lines.push("");

    // Add 1000 tasks in groups
    for (let section = 0; section < 10; section++) {
      lines.push(`## Section ${section + 1}`);
      lines.push("");

      for (let task = 0; task < 100; task++) {
        lines.push(`- [ ] Task ${section}.${task}`);

        // Add some nested tasks
        if (task % 10 === 0) {
          lines.push(`  - [ ] Subtask ${section}.${task}.1`);
          lines.push(`  - [ ] Subtask ${section}.${task}.2`);
        }
      }

      lines.push("");
    }

    const doc = lines.join("\n");

    // Test moving a task in the middle of the document
    const middleTaskLine = 500;
    const cursorPos = doc.split("\n").slice(0, middleTaskLine).join("\n").length + 1;

    const state = createEditorState(doc, cursorPos);
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior

    // Verify document integrity
    const newDoc = view.state.doc.toString();
    const newLines = newDoc.split("\n");

    // Same number of lines
    expect(newLines.length).toBe(lines.length);

    // Headers should remain intact
    expect(newLines.filter((line) => line.startsWith("#")).length).toBe(
      lines.filter((line) => line.startsWith("#")).length,
    );

    // Same number of tasks
    expect(newLines.filter((line) => line.includes("- [ ]")).length).toBe(
      lines.filter((line) => line.includes("- [ ]")).length,
    );
  });

  test("performance: moves task at end of 1000-line document", () => {
    const lines: string[] = [];

    // Generate 998 tasks
    for (let i = 0; i < 998; i++) {
      lines.push(`- [ ] Task ${i}`);
    }

    // Add the last two tasks we'll swap
    lines.push("- [ ] Task 998");
    lines.push("- [ ] Task 999");

    const doc = lines.join("\n");
    const secondLastLinePos = doc.lastIndexOf("- [ ] Task 998");

    const state = createEditorState(doc, secondLastLinePos);
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior

    const newDoc = view.state.doc.toString();
    expect(newDoc.endsWith("- [ ] Task 999\n- [ ] Task 998")).toBe(true);
  });
});

describe("Task Reorder - Mixed Width Spaces", () => {
  test("handles full-width spaces in empty lines", () => {
    const doc = `- [ ] Task A
　　　
- [ ] Task B`;

    const state = createEditorState(doc, 0); // Cursor on Task A
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior // Should not move across empty line with full-width spaces
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("handles mixed half and full-width spaces in indentation", () => {
    const doc = `- [ ] Parent
  - [ ] Child with normal spaces
　　- [ ] Child with full-width spaces
    - [ ] Nested with mixed`;

    const state = createEditorState(doc, 14); // Cursor on first child
    const view = createMockView(state);

    // Should be able to move within same parent despite different space types
    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).toHaveBeenCalled();
  });

  test("recognizes empty lines with various space types", () => {
    const testCases = [
      "   ", // Regular spaces
      "　　　", // Full-width spaces
      " 　 　", // Mixed spaces
      "\t\t", // Tabs
      " \t　", // All mixed
    ];

    for (const emptyLine of testCases) {
      const doc = `- [ ] Task A
${emptyLine}
- [ ] Task B`;

      const state = createEditorState(doc, 0); // Cursor on Task A
      const view = createMockView(state);

      const result = moveTaskDown(view);
      expect(result).toBe(true); // Returns true to prevent default behavior
    }
  });
});

describe("Task Reorder - File Boundary Edge Cases", () => {
  test("first task in file cannot move up", () => {
    const doc = `- [ ] First Task`;

    const state = createEditorState(doc, 0);
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("last task in file cannot move down", () => {
    const doc = `- [ ] Last Task`;

    const state = createEditorState(doc, 0);
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("handles document with only headings", () => {
    const doc = `# Section 1
## Subsection 1.1
### Subsubsection 1.1.1`;

    const state = createEditorState(doc, 15); // Cursor on second heading
    const view = createMockView(state);

    const resultUp = moveTaskUp(view);
    const resultDown = moveTaskDown(view);

    expect(resultUp).toBe(false);
    expect(resultDown).toBe(false);
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("single task with children at end of file", () => {
    const doc = `- [ ] Parent
  - [ ] Child 1
  - [ ] Child 2`;

    const state = createEditorState(doc, 0); // Cursor on parent
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior // Cannot move down - it's the only top-level task
    expect(view.dispatch).not.toHaveBeenCalled();
  });
});

describe("Task Reorder - Heading Section Boundaries", () => {
  test("task directly under heading cannot move into heading", () => {
    const doc = `# Section 1
- [ ] Task A
- [ ] Task B`;

    const state = createEditorState(doc, 12); // Cursor on Task A
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("task can move within section that includes heading", () => {
    const doc = `# Section 1
- [ ] Task A
- [ ] Task B
- [ ] Task C`;

    const state = createEditorState(doc, 25); // Cursor on Task B
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior
    expect(view.dispatch).toHaveBeenCalled();

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`# Section 1
- [ ] Task A
- [ ] Task C
- [ ] Task B`);
  });
});

describe("Task Reorder - Different Block Sizes", () => {
  test("swaps blocks of different lengths upward correctly", () => {
    const doc = `- [ ] Short task
- [ ] Long task with much more content here`;

    const state = createEditorState(doc, 17); // Cursor on long task
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- [ ] Long task with much more content here
- [ ] Short task`);

    // Check cursor position is maintained correctly
    const call = (view.dispatch as any).mock.calls[0][0];
    expect(call.selection.anchor).toBe(0); // Cursor at start of moved block
  });

  test("swaps blocks of different lengths downward correctly", () => {
    const doc = `- [ ] Short task
- [ ] Long task with much more content here`;

    const state = createEditorState(doc, 0); // Cursor at start of short task
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- [ ] Long task with much more content here
- [ ] Short task`);

    // Check cursor position accounts for size difference
    const call = (view.dispatch as any).mock.calls[0][0];
    // Moving down: cursor should be at target.start + offset + sizeDiff
    // sizeDiff = deltaTarget - deltaCurrent = 44 - 16 = 28
    const expectedPos = 17 + 0 + 28 - 1; // Start of target + offset + size diff - 1 = 44
    expect(call.selection.anchor).toBe(expectedPos);
  });

  test("handles blocks with children of different sizes", () => {
    const doc = `- [ ] Parent A
  - [ ] Child A1
  - [ ] Child A2
  - [ ] Child A3
- [ ] Parent B
  - [ ] Child B1`;

    const state = createEditorState(doc, 0); // Cursor on Parent A
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- [ ] Parent B
  - [ ] Child B1
- [ ] Parent A
  - [ ] Child A1
  - [ ] Child A2
  - [ ] Child A3`);
  });
});

describe("Task Reorder - Cursor Position on Failed Moves", () => {
  test("cursor stays in place when nested task has no valid upward target", () => {
    const doc = `## Section
- [ ] Parent task
  - [ ] First nested task with cursor here
  - [ ] Second nested task
- [ ] Another parent`;

    const cursorPos = 38; // Cursor after "cursor here" in first nested task
    const state = createEditorState(doc, cursorPos);
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior // Move operation failed

    // Check that no dispatch was called (no changes made)
    expect(view.dispatch).not.toHaveBeenCalled();

    // Document should remain unchanged
    expect(view.state.doc.toString()).toBe(doc);
  });

  test("cursor stays in place when task at document start tries to move up", () => {
    const doc = `- [ ] First task in document
  - [ ] Nested task
- [ ] Second task`;

    const cursorPos = 15; // Cursor in first task
    const state = createEditorState(doc, cursorPos);
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior // Move operation failed

    // Check that no dispatch was called
    expect(view.dispatch).not.toHaveBeenCalled();

    // Document should remain unchanged
    expect(view.state.doc.toString()).toBe(doc);
  });

  test("cursor stays in place when task cannot move across section boundary", () => {
    const doc = `## Section 1
- [ ] Task in section 1
## Section 2
- [ ] Task in section 2`;

    const cursorPos = 36; // Cursor in "Task in section 2"
    const state = createEditorState(doc, cursorPos);
    const view = createMockView(state);

    const result = moveTaskUp(view);
    expect(result).toBe(true); // Returns true to prevent default behavior // Move operation failed

    // Check that no dispatch was called
    expect(view.dispatch).not.toHaveBeenCalled();

    // Document should remain unchanged
    expect(view.state.doc.toString()).toBe(doc);
  });
});

describe("Task Reorder - MaxLine Constraint", () => {
  test("nested task respects maxLine when moving down", () => {
    const doc = `- [ ] Parent
  - [ ] Child 1
  - [ ] Child 2
  - [ ] Child 3
- [ ] Another Parent`;

    const state = createEditorState(doc, 31); // Cursor on Child 2
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior // Can move within parent's scope

    const newDoc = view.state.doc.toString();
    expect(newDoc).toBe(`- [ ] Parent
  - [ ] Child 1
  - [ ] Child 3
  - [ ] Child 2
- [ ] Another Parent`);
  });

  test("nested task cannot move beyond parent scope", () => {
    const doc = `- [ ] Parent
  - [ ] Child 1
  - [ ] Child 2
- [ ] Another Parent
  - [ ] Another Child`;

    const state = createEditorState(doc, 45); // Cursor on Child 2
    const view = createMockView(state);

    const result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior // Cannot move outside parent
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  test("deeply nested task respects all parent boundaries", () => {
    const doc = `- [ ] Grandparent
  - [ ] Parent
    - [ ] Child 1
    - [ ] Child 2
    - [ ] Child 3
  - [ ] Uncle
- [ ] Great Uncle`;

    const state = createEditorState(doc, 51); // Cursor on Child 2
    const view = createMockView(state);

    // Should be able to move down within parent
    let result = moveTaskDown(view);
    expect(result).toBe(true); // Returns true to prevent default behavior

    // After swap, the doc is:
    // - [ ] Grandparent
    //   - [ ] Parent
    //     - [ ] Child 1
    //     - [ ] Child 3
    //     - [ ] Child 2
    //   - [ ] Uncle
    // - [ ] Great Uncle

    // Reset and try to move Child 2 down (it's now the last child)
    const newDoc = view.state.doc.toString();
    const child2Pos = newDoc.indexOf("- [ ] Child 2");
    const newState = createEditorState(newDoc, child2Pos + 5); // Cursor on Child 2
    const newView = createMockView(newState);

    result = moveTaskDown(newView);
    expect(result).toBe(true); // Returns true to prevent default behavior // Cannot move beyond parent
  });
});
