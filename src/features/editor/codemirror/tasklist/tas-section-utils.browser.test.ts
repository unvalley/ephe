import { EditorView } from "@codemirror/view";
import { findTaskSection } from "./task-section-utils";
import { EditorState } from "@codemirror/state";
import { test, expect, describe } from "vitest";

const createViewFromText = (text: string): EditorView => {
  const state = EditorState.create({
    doc: text,
  });
  return new EditorView({ state });
};

describe("findTaskSection", () => {
  test("finds the nearest heading above the given line", () => {
    const text = `
    # Section 1
    Some text here
  
    ## Section 2
    - [ ] Task A
    - [ ] Task B
    `;
    const view = createViewFromText(text);
    // Task B is line 7 (1-based index)
    const result = findTaskSection(view, 7);
    expect(result).toBe("## Section 2");
  });

  test("returns undefined when no heading exists above", () => {
    const view = createViewFromText(`No heading here\nJust a line`);
    const result = findTaskSection(view, 2);
    expect(result).toBeUndefined();
  });

  test("skips non-heading lines and finds the correct one", () => {
    const text = `
    Random text
    ### Actual Section
    - [ ] Something
    `;
    const view = createViewFromText(text);
    const result = findTaskSection(view, 4);
    expect(result).toBe("### Actual Section");
  });
});
