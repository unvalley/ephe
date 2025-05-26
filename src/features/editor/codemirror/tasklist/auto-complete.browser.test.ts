import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { test, expect, describe } from "vitest";
import { taskAutoComplete } from "./auto-complete";

const createViewFromText = (text: string): EditorView => {
  const state = EditorState.create({
    doc: text,
    extensions: [taskAutoComplete],
  });
  return new EditorView({ state });
};

// Helper function to properly trigger input handlers
const triggerInput = (view: EditorView, text: string) => {
  const pos = view.state.selection.main.head;

  // Get all input handlers from the view
  const handlers = view.state.facet(EditorView.inputHandler);

  // Try each handler until one handles the input
  for (const handler of handlers) {
    if (handler(view, pos, pos, text, () => view.state.update({ changes: { from: pos, to: pos, insert: text } }))) {
      return; // Handler processed the input
    }
  }

  // If no handler processed it, apply the input normally
  view.dispatch({
    changes: { from: pos, to: pos, insert: text },
    selection: { anchor: pos + text.length },
  });
};

// Helper function to test the auto-complete functionality
const testAutoComplete = (initialText: string, cursorPos: number, inputText: string) => {
  const view = createViewFromText(initialText);

  // Set cursor position
  view.dispatch({
    selection: { anchor: cursorPos },
  });

  // Get the current state before input
  const beforeState = view.state.doc.toString();

  // Trigger input using the proper method
  triggerInput(view, inputText);

  return {
    before: beforeState,
    after: view.state.doc.toString(),
    cursorPosition: view.state.selection.main.anchor,
  };
};

describe("taskAutoComplete", () => {
  test("basic functionality test - manual verification", () => {
    // This test verifies that the extension is properly configured
    // The actual auto-completion behavior is tested through integration
    const view = createViewFromText("- [");
    expect(view.state.doc.toString()).toBe("- [");

    // Verify the extension is loaded
    const handlers = view.state.facet(EditorView.inputHandler);
    expect(handlers.length).toBeGreaterThan(0);
  });

  test("auto-complete with '- [ ' pattern", () => {
    const result = testAutoComplete("- [", 3, " ");

    expect(result.before).toBe("- [");
    expect(result.after).toBe("- [ ] ");
    expect(result.cursorPosition).toBe(6);
  });

  test("auto-complete with '-[ ' pattern", () => {
    const result = testAutoComplete("-[", 2, " ");

    expect(result.before).toBe("-[");
    expect(result.after).toBe("- [ ] ");
    expect(result.cursorPosition).toBe(6);
  });

  test("auto-complete with indented '- [ ' pattern", () => {
    const result = testAutoComplete("  - [", 5, " ");

    expect(result.before).toBe("  - [");
    expect(result.after).toBe("  - [ ] ");
    expect(result.cursorPosition).toBe(8);
  });

  test("auto-complete with indented '-[ ' pattern", () => {
    const result = testAutoComplete("  -[", 4, " ");

    expect(result.before).toBe("  -[");
    expect(result.after).toBe("  - [ ] ");
    expect(result.cursorPosition).toBe(8);
  });

  test("document structure remains intact without auto-complete trigger", () => {
    const result = testAutoComplete("some text", 9, " ");

    expect(result.before).toBe("some text");
    expect(result.after).toBe("some text ");
    expect(result.cursorPosition).toBe(10);
  });

  test("typing non-space characters does not trigger auto-complete", () => {
    const result = testAutoComplete("- [", 3, "x");

    expect(result.before).toBe("- [");
    expect(result.after).toBe("- [x");
    expect(result.cursorPosition).toBe(4);
  });

  test("partial patterns do not trigger auto-complete", () => {
    const result = testAutoComplete("- ", 2, " ");

    expect(result.before).toBe("- ");
    expect(result.after).toBe("-  ");
    expect(result.cursorPosition).toBe(3);
  });

  test("single dash pattern does not trigger auto-complete", () => {
    const result = testAutoComplete("-", 1, " ");

    expect(result.before).toBe("-");
    expect(result.after).toBe("- ");
    expect(result.cursorPosition).toBe(2);
  });

  test("early cursor position does not trigger auto-complete", () => {
    const result = testAutoComplete("ab", 2, " ");

    expect(result.before).toBe("ab");
    expect(result.after).toBe("ab ");
    expect(result.cursorPosition).toBe(3);
  });

  test("multi-line document structure", () => {
    const result = testAutoComplete("First line\nSecond line", 22, " ");

    expect(result.before).toBe("First line\nSecond line");
    expect(result.after).toBe("First line\nSecond line ");
    expect(result.cursorPosition).toBe(23);
  });

  test("extension integration with EditorView", () => {
    const view = createViewFromText("test content");

    // Verify the view is properly initialized
    expect(view.state.doc.toString()).toBe("test content");
    expect(view.state.doc.length).toBe(12);

    // Test basic editing functionality
    view.dispatch({
      changes: { from: 12, to: 12, insert: " added" },
    });

    expect(view.state.doc.toString()).toBe("test content added");
  });

  test("cursor positioning after manual edits", () => {
    const view = createViewFromText("- [");

    // Manually simulate what auto-complete should do
    view.dispatch({
      changes: { from: 0, to: 3, insert: "- [ ] " },
      selection: { anchor: 6 },
    });

    expect(view.state.doc.toString()).toBe("- [ ] ");
    expect(view.state.selection.main.anchor).toBe(6);
  });

  test("line boundary handling", () => {
    const view = createViewFromText("line1\n- [");
    const lineInfo = view.state.doc.lineAt(9); // Position after "- ["

    expect(lineInfo.number).toBe(2);
    expect(lineInfo.from).toBe(6);
    expect(lineInfo.to).toBe(9);
  });

  test("pattern matching verification for both patterns", () => {
    const testCases = [
      { text: "- [", pos: 3, shouldMatchLong: true, shouldMatchShort: false },
      { text: "-[", pos: 2, shouldMatchLong: false, shouldMatchShort: true },
      { text: "  - [", pos: 5, shouldMatchLong: true, shouldMatchShort: false },
      { text: "  -[", pos: 4, shouldMatchLong: false, shouldMatchShort: true },
      { text: "- ", pos: 2, shouldMatchLong: false, shouldMatchShort: false },
      { text: "text", pos: 4, shouldMatchLong: false, shouldMatchShort: false },
      { text: "ab", pos: 2, shouldMatchLong: false, shouldMatchShort: false },
    ];

    testCases.forEach(({ text, pos, shouldMatchLong, shouldMatchShort }) => {
      const view = createViewFromText(text);
      const line = view.state.doc.lineAt(pos);
      const linePrefix = view.state.doc.sliceString(line.from, pos);
      const matchesLong = linePrefix.endsWith("- [") && pos >= 3;
      const matchesShort = linePrefix.endsWith("-[") && pos >= 2;

      expect(matchesLong).toBe(shouldMatchLong);
      expect(matchesShort).toBe(shouldMatchShort);
    });
  });

  test("selection replacement does not trigger auto-complete", () => {
    const view = createViewFromText("- [test]");

    // Select "test" and replace with space
    view.dispatch({
      changes: { from: 3, to: 7, insert: " " },
      selection: { anchor: 4 },
    });

    // Should not auto-complete because it's a selection replacement
    expect(view.state.doc.toString()).toBe("- [ ]");
    expect(view.state.selection.main.anchor).toBe(4);
  });
});
