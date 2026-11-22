import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, test } from "vitest";
import { typewriterPlaceholder } from "./typewriter-placeholder";

const views: EditorView[] = [];

const createView = (doc: string): EditorView => {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const view = new EditorView({ state: EditorState.create({ doc, extensions: [typewriterPlaceholder()] }), parent });
  views.push(view);
  return view;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const placeholderText = (view: EditorView) => view.contentDOM.querySelector(".cm-placeholder")?.textContent ?? null;

describe("typewriterPlaceholder", () => {
  afterEach(() => {
    for (const view of views.splice(0)) {
      view.destroy();
      view.dom.parentElement?.remove();
    }
  });

  test("gives the caret a line's height before the first letter is typed", () => {
    const view = createView("");
    const caret = view.coordsAtPos(0, 1);
    expect(caret).not.toBeNull();
    expect((caret?.bottom ?? 0) - (caret?.top ?? 0)).toBeGreaterThan(0);
  });

  test("types a prompt into the placeholder of an empty page", async () => {
    const view = createView("");
    await wait(700);
    const first = placeholderText(view) ?? "";
    expect(first.length).toBeGreaterThan(0);

    await wait(300);
    expect((placeholderText(view) ?? "").length).toBeGreaterThan(first.length);
  });

  test("stops typing once the page has text and resumes when it is cleared", async () => {
    const view = createView("");
    await wait(600);
    const typer = view.contentDOM.querySelector(".cm-typewriter");
    view.dispatch({ changes: { from: 0, insert: "hello" } });
    expect(placeholderText(view)).toBeNull();

    const frozen = typer?.textContent;
    await wait(400);
    expect(typer?.textContent).toBe(frozen);

    view.dispatch({ changes: { from: 0, to: view.state.doc.length } });
    await wait(700);
    expect(placeholderText(view)).not.toBeNull();
  });
});
