import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, test } from "vitest";
import { inlineCalcExtension } from "./index";

const createViewFromText = (text: string): EditorView => {
  const state = EditorState.create({
    doc: text,
    extensions: [inlineCalcExtension],
  });
  const view = new EditorView({ state });
  document.body.appendChild(view.dom);
  return view;
};

const resultTexts = (view: EditorView): string[] =>
  Array.from(view.dom.querySelectorAll(".cm-calc-result")).map((el) => el.textContent ?? "");

describe("inlineCalcExtension", () => {
  test("renders a result widget for math lines", () => {
    const view = createViewFromText("12 * 4");
    expect(resultTexts(view)).toEqual(["= 48"]);
    view.destroy();
  });

  test("does not decorate plain text", () => {
    const view = createViewFromText("just a note about 3 things");
    expect(resultTexts(view)).toEqual([]);
    view.destroy();
  });

  test("updates results when the document changes", () => {
    const view = createViewFromText("1 + 1");
    expect(resultTexts(view)).toEqual(["= 2"]);

    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "2 + 3" } });
    expect(resultTexts(view)).toEqual(["= 5"]);
    view.destroy();
  });

  test("supports variables and sum across lines", () => {
    // sum collects the whole block above: 1200 (assignment) + 2400 + 10 + 20.
    const view = createViewFromText(["price = 1200", "price * 2", "10", "20", "sum"].join("\n"));
    expect(resultTexts(view)).toEqual(["= 2400", "= 3630"]);
    view.destroy();
  });
});
