import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { test, expect, describe, vi, afterEach } from "vitest";
import { taskMouseInteraction, type TaskHandler } from "./task-close";

const createView = (text: string, taskHandler: TaskHandler): EditorView => {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc: text,
    extensions: [taskMouseInteraction(taskHandler)],
  });
  return new EditorView({ state, parent });
};

const clickAt = (view: EditorView, pos: number) => {
  const coords = view.coordsAtPos(pos);
  if (!coords) throw new Error(`no coords at pos ${pos}`);
  const x = (coords.left + coords.right) / 2;
  const y = (coords.top + coords.bottom) / 2;
  view.dom.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: x, clientY: y, button: 0 }));
};

describe("taskMouseInteraction", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("clicking an open checkbox toggles it and calls onTaskClosed", () => {
    const onTaskClosed = vi.fn();
    const onTaskOpen = vi.fn();
    const view = createView("- [ ] Buy milk", { onTaskClosed, onTaskOpen });

    clickAt(view, 3);

    expect(view.state.doc.toString()).toBe("- [x] Buy milk");
    expect(onTaskOpen).not.toHaveBeenCalled();
    expect(onTaskClosed).toHaveBeenCalledTimes(1);
    expect(onTaskClosed).toHaveBeenCalledWith(
      expect.objectContaining({
        taskContent: "Buy milk",
        originalLine: "- [ ] Buy milk",
      }),
    );
  });

  test("clicking a checked checkbox toggles it and calls onTaskOpen", () => {
    const onTaskClosed = vi.fn();
    const onTaskOpen = vi.fn();
    const view = createView("- [x] Buy milk", { onTaskClosed, onTaskOpen });

    clickAt(view, 3);

    expect(view.state.doc.toString()).toBe("- [ ] Buy milk");
    expect(onTaskClosed).not.toHaveBeenCalled();
    expect(onTaskOpen).toHaveBeenCalledTimes(1);
    expect(onTaskOpen).toHaveBeenCalledWith("Buy milk");
  });
});
