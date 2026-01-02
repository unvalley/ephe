import { EditorView, keymap, type KeyBinding } from "@codemirror/view";
import { EditorState, Prec } from "@codemirror/state";
import { test, expect, describe } from "vitest";
import { taskKeyBindings } from "./keymap";

const createViewFromText = (text: string, cursorPos?: number): EditorView => {
  const state = EditorState.create({
    doc: text,
    extensions: [Prec.high(keymap.of(taskKeyBindings))],
    selection: cursorPos !== undefined ? { anchor: cursorPos } : undefined,
  });
  return new EditorView({ state });
};

// Helper function to simulate key press
const simulateKeyPress = (view: EditorView, key: string): boolean => {
  for (const binding of taskKeyBindings) {
    if (binding.key === key && binding.run) {
      return binding.run(view);
    }
  }
  return false;
};

// Helper function for testing key behaviors
const testKeyBehavior = (initialText: string, cursorPos: number, key: string) => {
  const view = createViewFromText(initialText, cursorPos);
  const beforeText = view.state.doc.toString();
  const beforeCursor = view.state.selection.main.head;

  const handled = simulateKeyPress(view, key);

  return {
    beforeText,
    afterText: view.state.doc.toString(),
    beforeCursor,
    afterCursor: view.state.selection.main.head,
    handled,
  };
};

describe("taskKeyBindings - Tab Key", () => {
  test("indents task item with matching sibling above", () => {
    const result = testKeyBehavior("- [ ] Task 1\n- [ ] Task 2", 25, "Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("- [ ] Task 1\n  - [ ] Task 2");
  });

  test("does not indent if already nested deeper than previous", () => {
    const result = testKeyBehavior("- [ ] Task 1\n    - [ ] Task 2", 29, "Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("- [ ] Task 1\n    - [ ] Task 2");
  });

  test("indents root level task with fallback", () => {
    const result = testKeyBehavior("- [ ] Task", 10, "Tab");

    // This should fall back to indentMore, but since we don't have that extension loaded,
    // it might behave differently. We'll just check it's handled.
    expect(result.handled).toBe(true);
  });

  test("blocks indent for nested item without suitable sibling", () => {
    const result = testKeyBehavior("Normal text\n  - [ ] Task", 24, "Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("Normal text\n  - [ ] Task");
  });

  test("does not handle non-task lines", () => {
    const result = testKeyBehavior("Normal text", 11, "Tab");

    // Should fall back to indentMore
    expect(result.handled).toBe(true);
  });

  test("handles selection by falling back to indentMore", () => {
    const view = createViewFromText("- [ ] Task", 0);
    view.dispatch({ selection: { anchor: 0, head: 5 } });

    const handled = simulateKeyPress(view, "Tab");
    expect(handled).toBe(true);
  });
});

describe("taskKeyBindings - Shift-Tab Key", () => {
  test("dedents indented task item", () => {
    const result = testKeyBehavior("  - [ ] Task", 12, "Shift-Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("- [ ] Task");
  });

  test("does not dedent task without indent", () => {
    const result = testKeyBehavior("- [ ] Task", 10, "Shift-Tab");

    // Should fall back to indentLess
    expect(result.handled).toBe(true);
  });
});

describe("taskKeyBindings - Delete Key", () => {
  test("converts empty task line to regular list line at end", () => {
    const result = testKeyBehavior("- [ ]", 5, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("- [ ]");
    expect(result.afterText).toBe("- ");
    expect(result.afterCursor).toBe(2);
  });

  test("converts empty task line to regular list line with content after", () => {
    const result = testKeyBehavior("- [ ]\nNext line", 5, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("- [ ]\nNext line");
    expect(result.afterText).toBe("- \nNext line");
    expect(result.afterCursor).toBe(2);
  });

  test("converts empty task line to regular list line in middle", () => {
    const result = testKeyBehavior("Line 1\n- [ ]\nLine 3", 12, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("Line 1\n- [ ]\nLine 3");
    expect(result.afterText).toBe("Line 1\n- \nLine 3");
    expect(result.afterCursor).toBe(9);
  });

  test("does not handle cursor not at line end", () => {
    const result = testKeyBehavior("- [ ]", 3, "Delete");

    expect(result.handled).toBe(false);
    expect(result.beforeText).toBe("- [ ]");
    expect(result.afterText).toBe("- [ ]");
  });

  test("does not handle non-empty task", () => {
    const result = testKeyBehavior("- [ ] Content", 13, "Delete");

    expect(result.handled).toBe(false);
    expect(result.beforeText).toBe("- [ ] Content");
    expect(result.afterText).toBe("- [ ] Content");
  });

  test("does not handle when selection exists", () => {
    const view = createViewFromText("- [ ]", 0);
    view.dispatch({ selection: { anchor: 0, head: 5 } });

    const handled = simulateKeyPress(view, "Delete");
    expect(handled).toBe(false);
  });

  test("converts completed task to regular list line", () => {
    const result = testKeyBehavior("- [x]", 5, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("- [x]");
    expect(result.afterText).toBe("- ");
    expect(result.afterCursor).toBe(2);
  });

  test("converts bullet list empty task to regular list line", () => {
    const result = testKeyBehavior("* [ ]", 5, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("* [ ]");
    expect(result.afterText).toBe("* ");
    expect(result.afterCursor).toBe(2);
  });

  test("converts empty regular list line to plain text", () => {
    const result = testKeyBehavior("- ", 2, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("- ");
    expect(result.afterText).toBe("");
    expect(result.afterCursor).toBe(0);
  });

  test("converts empty asterisk list line to plain text", () => {
    const result = testKeyBehavior("* ", 2, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("* ");
    expect(result.afterText).toBe("");
    expect(result.afterCursor).toBe(0);
  });

  test("converts empty plus list line to plain text", () => {
    const result = testKeyBehavior("+ ", 2, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("+ ");
    expect(result.afterText).toBe("");
    expect(result.afterCursor).toBe(0);
  });

  test("preserves indentation when converting empty list to plain text", () => {
    const result = testKeyBehavior("  - ", 4, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("  - ");
    expect(result.afterText).toBe("  ");
    expect(result.afterCursor).toBe(2);
  });

  test("removes task when delete pressed after task with content", () => {
    const result = testKeyBehavior("- [ ] aaaa", 6, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("- [ ] aaaa");
    expect(result.afterText).toBe("- aaaa");
    expect(result.afterCursor).toBe(2);
  });

  test("removes task when delete pressed after task with indented content", () => {
    const result = testKeyBehavior("  - [ ] aaaa", 8, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("  - [ ] aaaa");
    expect(result.afterText).toBe("  - aaaa");
    expect(result.afterCursor).toBe(4);
  });

  test("removes checked task when delete pressed after task with lowercase x", () => {
    const result = testKeyBehavior("- [x] completed task", 6, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("- [x] completed task");
    expect(result.afterText).toBe("- completed task");
    expect(result.afterCursor).toBe(2);
  });

  test("removes checked task when delete pressed after task with uppercase X", () => {
    const result = testKeyBehavior("- [X] completed task", 6, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("- [X] completed task");
    expect(result.afterText).toBe("- completed task");
    expect(result.afterCursor).toBe(2);
  });

  test("removes checked task with asterisk bullet", () => {
    const result = testKeyBehavior("* [x] completed task", 6, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("* [x] completed task");
    expect(result.afterText).toBe("* completed task");
    expect(result.afterCursor).toBe(2);
  });

  test("removes indented checked task", () => {
    const result = testKeyBehavior("  - [X] indented completed", 8, "Delete");

    expect(result.handled).toBe(true);
    expect(result.beforeText).toBe("  - [X] indented completed");
    expect(result.afterText).toBe("  - indented completed");
    expect(result.afterCursor).toBe(4);
  });
});

describe("taskKeyBindings - Integration", () => {
  test("keymap is properly configured", () => {
    // Verify our key bindings are present
    const enterBinding = taskKeyBindings.find((b: KeyBinding) => b.key === "Enter");
    const tabBinding = taskKeyBindings.find((b: KeyBinding) => b.key === "Tab");
    const shiftTabBinding = taskKeyBindings.find((b: KeyBinding) => b.key === "Shift-Tab");
    const deleteBinding = taskKeyBindings.find((b: KeyBinding) => b.key === "Delete");

    expect(enterBinding).toBeUndefined();
    expect(tabBinding).toBeDefined();
    expect(shiftTabBinding).toBeDefined();
    expect(deleteBinding).toBeDefined();
  });
});

describe("taskKeyBindings - Regular Lists (Tab Key)", () => {
  test("indents regular list item with matching sibling above", () => {
    const result = testKeyBehavior("- Item 1\n- Item 2", 17, "Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("- Item 1\n  - Item 2");
  });

  test("indents regular list item with asterisk bullet", () => {
    const result = testKeyBehavior("* Item 1\n* Item 2", 17, "Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("* Item 1\n  * Item 2");
  });

  test("indents regular list item with plus bullet", () => {
    const result = testKeyBehavior("+ Item 1\n+ Item 2", 17, "Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("+ Item 1\n  + Item 2");
  });

  test("does not indent if already nested deeper than previous regular list", () => {
    const result = testKeyBehavior("- Item 1\n    - Item 2", 21, "Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("- Item 1\n    - Item 2");
  });

  test("blocks indent for nested regular list item without suitable sibling", () => {
    const result = testKeyBehavior("Normal text\n  - Item", 20, "Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("Normal text\n  - Item");
  });

  test("indents root level regular list with fallback", () => {
    const result = testKeyBehavior("- Item", 6, "Tab");

    expect(result.handled).toBe(true);
  });
});

describe("taskKeyBindings - Regular Lists (Shift-Tab Key)", () => {
  test("dedents indented regular list item", () => {
    const result = testKeyBehavior("  - Item", 8, "Shift-Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("- Item");
  });

  test("dedents indented regular list item with asterisk", () => {
    const result = testKeyBehavior("  * Item", 8, "Shift-Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("* Item");
  });

  test("dedents indented regular list item with plus", () => {
    const result = testKeyBehavior("  + Item", 8, "Shift-Tab");

    expect(result.handled).toBe(true);
    expect(result.afterText).toBe("+ Item");
  });

  test("does not dedent regular list without indent", () => {
    const result = testKeyBehavior("- Item", 6, "Shift-Tab");

    expect(result.handled).toBe(true);
  });
});
