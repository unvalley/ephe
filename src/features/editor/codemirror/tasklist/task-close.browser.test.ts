import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, test } from "vitest";
import type { OnTaskClosed } from ".";
import { parseTaskState, type TaskHandler, taskToggleListener } from "./task-close";

type Recorded = { closed: OnTaskClosed[]; opened: string[] };

const createView = (doc: string, handler?: TaskHandler) => {
  const state = EditorState.create({
    doc,
    extensions: [taskToggleListener(() => handler)],
  });
  return new EditorView({ state });
};

const createRecordingHandler = (): { handler: TaskHandler; recorded: Recorded } => {
  const recorded: Recorded = { closed: [], opened: [] };
  return {
    recorded,
    handler: {
      onTaskClosed: (event) => recorded.closed.push(event),
      onTaskOpen: (content) => recorded.opened.push(content),
    },
  };
};

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

const replace = (view: EditorView, from: number, to: number, insert: string) =>
  view.dispatch({ changes: { from, to, insert } });

describe("parseTaskState", () => {
  test("recognises open and closed tasks", () => {
    expect(parseTaskState("- [ ] Task")).toEqual({ state: "open", content: "Task" });
    expect(parseTaskState("  * [X] Task")).toEqual({ state: "closed", content: "Task" });
    expect(parseTaskState("- [] Task")).toEqual({ state: "open", content: "Task" });
  });

  test("rejects non-task lines", () => {
    expect(parseTaskState("- Task")).toBeNull();
    expect(parseTaskState("- [y] Task")).toBeNull();
    expect(parseTaskState("Task")).toBeNull();
  });
});

describe("taskToggleListener", () => {
  test("reports a task closed when its checkbox is checked", async () => {
    const { handler, recorded } = createRecordingHandler();
    const view = createView("# Work\n- [ ] Ship it", handler);

    replace(view, 10, 11, "x");
    await flush();

    expect(recorded.closed).toHaveLength(1);
    expect(recorded.closed[0].taskContent).toBe("Ship it");
    expect(recorded.closed[0].section).toBe("# Work");
    expect(recorded.closed[0].originalLine).toBe("- [x] Ship it");
    expect(recorded.closed[0].pos).toBe(7);
    expect(recorded.opened).toHaveLength(0);
  });

  test("reports a task opened when its checkbox is unchecked", async () => {
    const { handler, recorded } = createRecordingHandler();
    const view = createView("- [x] Ship it", handler);

    replace(view, 3, 4, " ");
    await flush();

    expect(recorded.opened).toEqual(["Ship it"]);
    expect(recorded.closed).toHaveLength(0);
  });

  test("handles the keyboard flow of deleting the space then typing x", async () => {
    const { handler, recorded } = createRecordingHandler();
    const view = createView("- [ ] Ship it", handler);

    replace(view, 3, 4, "");
    replace(view, 3, 3, "x");
    await flush();

    expect(recorded.closed).toHaveLength(1);
    expect(recorded.closed[0].taskContent).toBe("Ship it");
  });

  test("ignores typing a completed task from scratch", async () => {
    const { handler, recorded } = createRecordingHandler();
    const view = createView("", handler);

    for (const char of "- [x] Ship it") {
      replace(view, view.state.doc.length, view.state.doc.length, char);
    }
    await flush();

    expect(recorded.closed).toHaveLength(0);
    expect(recorded.opened).toHaveLength(0);
  });

  test("ignores content edits that keep the checkbox state", async () => {
    const { handler, recorded } = createRecordingHandler();
    const view = createView("- [x] Ship it", handler);

    replace(view, 13, 13, " today");
    await flush();

    expect(recorded.closed).toHaveLength(0);
    expect(recorded.opened).toHaveLength(0);
  });

  test("ignores whole-document replacement", async () => {
    const { handler, recorded } = createRecordingHandler();
    const view = createView("- [ ] A\n- [ ] B", handler);

    replace(view, 0, view.state.doc.length, "- [x] A\n- [x] B\n- [x] C");
    await flush();

    expect(recorded.closed).toHaveLength(0);
  });

  test("uses the handler registered at the time of the toggle", async () => {
    const first = createRecordingHandler();
    const second = createRecordingHandler();
    let current: TaskHandler | undefined = first.handler;
    const view = new EditorView({
      state: EditorState.create({ doc: "- [ ] A", extensions: [taskToggleListener(() => current)] }),
    });

    current = second.handler;
    replace(view, 3, 4, "x");
    await flush();

    expect(first.recorded.closed).toHaveLength(0);
    expect(second.recorded.closed).toHaveLength(1);
  });

  test("does nothing without a handler", async () => {
    const view = createView("- [ ] A");
    expect(() => replace(view, 3, 4, "x")).not.toThrow();
    await flush();
  });
});
