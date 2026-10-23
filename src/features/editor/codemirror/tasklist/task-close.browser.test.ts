import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, test } from "vitest";
import { taskStorage } from "../../tasks/task-storage";
import { createChecklistPlugin, createDefaultTaskHandler } from ".";
import { registerTaskHandler } from "./task-close";

const views: EditorView[] = [];

// Like the editor: the plugin is built with the mode at creation time, and the
// handler for the current mode is registered afterwards.
const createView = (doc: string, persistedEvents: string[] = []): EditorView => {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    extensions: [
      createChecklistPlugin(createDefaultTaskHandler(taskStorage, "off")),
      EditorView.updateListener.of((update) => {
        for (const tr of update.transactions) {
          if (tr.isUserEvent("input") || tr.isUserEvent("delete")) {
            persistedEvents.push(tr.newDoc.toString());
          }
        }
      }),
    ],
  });
  const view = new EditorView({ state, parent });
  views.push(view);
  return view;
};

const clickCheckbox = (view: EditorView, lineNumber: number) => {
  const line = view.state.doc.line(lineNumber);
  const coords = view.coordsAtPos(line.text.indexOf("[") + line.from + 1);
  if (!coords) throw new Error(`no coords for line ${lineNumber}`);
  view.dom.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      button: 0,
      clientX: coords.left + 1,
      clientY: (coords.top + coords.bottom) / 2,
    }),
  );
};

describe("task checkbox click", () => {
  afterEach(() => {
    for (const view of views.splice(0)) {
      view.dom.parentElement?.remove();
      view.destroy();
    }
    registerTaskHandler(undefined);
    taskStorage.deleteAll();
  });

  test("with task flush on, closing a task removes its line and records it", () => {
    registerTaskHandler(createDefaultTaskHandler(taskStorage, "instant"));
    const persisted: string[] = [];
    const view = createView("# Today\n- [ ] Buy milk\n- [ ] Walk dog", persisted);

    clickCheckbox(view, 2);

    expect(view.state.doc.toString()).toBe("# Today\n- [ ] Walk dog");
    expect(persisted.at(-1)).toBe("# Today\n- [ ] Walk dog");
    expect(taskStorage.getAll()).toEqual([
      expect.objectContaining({ content: "Buy milk", originalLine: "- [x] Buy milk", section: "# Today" }),
    ]);
  });

  test("with task flush off, closing a task keeps its line checked and records it", () => {
    registerTaskHandler(createDefaultTaskHandler(taskStorage, "off"));
    const view = createView("# Today\n- [ ] Buy milk\n- [ ] Walk dog");

    clickCheckbox(view, 2);

    expect(view.state.doc.toString()).toBe("# Today\n- [x] Buy milk\n- [ ] Walk dog");
    expect(taskStorage.getAll()).toEqual([expect.objectContaining({ content: "Buy milk", section: "# Today" })]);
  });

  test("reopening a closed task removes it from the record", () => {
    registerTaskHandler(createDefaultTaskHandler(taskStorage, "off"));
    const view = createView("- [ ] Buy milk");

    clickCheckbox(view, 1);
    expect(taskStorage.getAll()).toHaveLength(1);

    clickCheckbox(view, 1);

    expect(view.state.doc.toString()).toBe("- [ ] Buy milk");
    expect(taskStorage.getAll()).toHaveLength(0);
  });
});
