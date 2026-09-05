import {
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  Decoration,
  type DecorationSet,
  type PluginValue,
} from "@codemirror/view";
import { StateEffect, StateField, RangeSetBuilder, type Text, type Transaction } from "@codemirror/state";
import type { OnTaskClosed } from ".";
import { findTaskSection } from "./task-section-utils";

export type TaskHandler = {
  onTaskClosed: ({ taskContent, originalLine, section }: OnTaskClosed) => void;
  onTaskOpen: (taskContent: string) => void;
};

// use utils
const taskItemRegex = /^(\s*[-*]\s+)\[([ xX])\]/;

type TaskInfo = {
  from: number; // start position of the task (')
  to: number; // end position of the task (']' next)
  contentPos: number; // position of the task content ('[' next)
  checked: boolean; // task state
  line: number; // Line number containing the task
  key: string; // Unique identifier for the task
};

// Effect to track the task being hovered over
const hoverTask = StateEffect.define<TaskInfo | null>();

// Decoration for the pointer style applied to all tasks
const taskBaseStyle = Decoration.mark({
  class: "cursor-pointer",
  inclusive: false,
});

// Decoration for the additional highlight when hovering over a task
const taskHoverStyle = Decoration.mark({
  class: "cm-task-hover",
  inclusive: false,
});

/**
 * Resolves the handler lazily so the editor can swap it (e.g. when the
 * auto-flush setting changes) without reconfiguring the extension.
 */
export type GetTaskHandler = () => TaskHandler | undefined;

// Utility to generate a unique key for a task
const getTaskKey = (lineNumber: number, content: string): string => {
  return `${lineNumber}:${content.trim()}`;
};

export const taskDecoration = ViewPlugin.fromClass(
  class {
    taskes: TaskInfo[] = [];
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.taskes = this.findAllTaskes(view);
      this.decorations = this.createBaseDecorations(this.taskes);
    }

    // Detect tasks in the visible portion of the document only
    findAllTaskes(view: EditorView): TaskInfo[] {
      const result: TaskInfo[] = [];
      const { doc } = view.state;

      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to; ) {
          const line = doc.lineAt(pos);
          const match = line.text.match(taskItemRegex);

          if (match) {
            // Search for the entire task pattern to determine the exact position
            const matchIndex = match.index || 0;
            const prefixLength = match[1].length;

            // Calculate the position of '['
            const taskStartPos = matchIndex + prefixLength;
            const taskFrom = line.from + taskStartPos;
            const contentPos = taskFrom + 1; // next of '['
            const taskTo = taskFrom + 3; // '[' + content + ']' = 3 chars

            const checkChar = match[2];
            const taskContent = line.text.substring(matchIndex + prefixLength + 3).trim();

            result.push({
              from: taskFrom,
              to: taskTo,
              contentPos,
              checked: checkChar === "x" || checkChar === "X",
              line: line.number,
              key: getTaskKey(line.number, taskContent),
            });
          }

          pos = line.to + 1;
        }
      }
      return result;
    }

    // Create base decorations for all tasks
    createBaseDecorations(taskes: TaskInfo[]): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of taskes) {
        builder.add(from, to, taskBaseStyle);
      }
      return builder.finish();
    }

    // Detect tasks when the document or visible range changes
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        // Keep task decorations in sync with document edits and scrolling.
        this.taskes = this.findAllTaskes(update.view);
        this.decorations = this.createBaseDecorations(this.taskes);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

export const taskHoverField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(hoverTask)) {
        const hoverInfo = e.value;
        if (hoverInfo) {
          // Create a new hover decoration
          const builder = new RangeSetBuilder<Decoration>();
          builder.add(hoverInfo.from, hoverInfo.to, taskHoverStyle);
          return builder.finish();
        }
        // Clear hover decoration
        return Decoration.none;
      }
    }

    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const taskMouseInteraction = () => {
  return ViewPlugin.fromClass(
    class implements PluginValue {
      constructor(readonly view: EditorView) {
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);

        this.view.dom.addEventListener("mousemove", this.handleMouseMove);
        this.view.dom.addEventListener("mouseleave", this.handleMouseLeave);
        this.view.dom.addEventListener("mousedown", this.handleMouseDown);
      }

      destroy() {
        this.view.dom.removeEventListener("mousemove", this.handleMouseMove);
        this.view.dom.removeEventListener("mouseleave", this.handleMouseLeave);
        this.view.dom.removeEventListener("mousedown", this.handleMouseDown);
      }

      getTaskAt(pos: number): TaskInfo | null {
        const line = this.view.state.doc.lineAt(pos);
        const match = line.text.match(taskItemRegex);
        if (!match) return null;

        const matchIndex = match.index || 0;
        const prefixLength = match[1].length;
        const taskStartPos = matchIndex + prefixLength;
        const from = line.from + taskStartPos;
        const contentPos = from + 1;
        const to = from + 3; // next of ']'

        if (pos >= from && pos < to) {
          const checkChar = match[2];
          const taskContent = line.text.substring(matchIndex + prefixLength + 3).trim();

          return {
            from,
            to,
            contentPos,
            checked: checkChar === "x" || checkChar === "X",
            line: line.number,
            key: getTaskKey(line.number, taskContent),
          };
        }
        return null;
      }

      handleMouseMove(event: MouseEvent) {
        // Performance optimization: Only check on real mouse movement
        // Skip duplicate events at the same coordinates
        const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos === null) return;
        const task = this.getTaskAt(pos);

        this.view.dispatch({
          effects: hoverTask.of(task),
        });
      }

      handleMouseLeave() {
        this.view.dispatch({
          effects: hoverTask.of(null),
        });
      }

      handleMouseDown(event: MouseEvent) {
        // only left click
        if (event.button !== 0) return;

        const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos == null) return;

        const task = this.getTaskAt(pos);
        if (!task) return;

        event.preventDefault();
        const newChar = task.checked ? " " : "x";

        this.view.dispatch({
          changes: {
            from: task.contentPos,
            to: task.contentPos + 1,
            insert: newChar,
          },
          userEvent: "input.toggleTask",
        });
      }
    },
  );
};

type TaskState = "open" | "closed";

// Looser than `taskItemRegex`: also accepts `- []` so the keyboard flow
// "Backspace the space, then type x" is seen as open -> closed instead of
// as two unrelated non-task lines.
const taskStateRegex = /^\s*[-*]\s+\[([^\]]*)\]\s*(.*)$/;

type ParsedTaskLine = { state: TaskState; content: string };

export const parseTaskState = (lineText: string): ParsedTaskLine | null => {
  const match = lineText.match(taskStateRegex);
  if (!match) return null;
  const inner = match[1].trim();
  if (inner === "x" || inner === "X") return { state: "closed", content: match[2].trim() };
  if (inner === "") return { state: "open", content: match[2].trim() };
  return null;
};

export type TaskToggle = {
  state: TaskState; // state after the change
  content: string;
  lineNumber: number; // in the new document
  from: number; // line start in the new document
  originalLine: string;
};

const linesInRange = (doc: Text, from: number, to: number) => {
  const first = doc.lineAt(from).number;
  const last = doc.lineAt(to).number;
  const lines = [];
  for (let n = first; n <= last; n++) lines.push(doc.line(n));
  return lines;
};

/**
 * A toggle is a line whose checkbox flipped while its content stayed the same.
 * Only changes that keep the line count (typing/clicking inside the brackets,
 * undo of such an edit) qualify; pasting or restoring whole blocks does not
 * count as completing work.
 */
export const findTaskToggles = (tr: Transaction): TaskToggle[] => {
  const toggles: TaskToggle[] = [];
  if (!tr.docChanged) return toggles;

  tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    const before = linesInRange(tr.startState.doc, fromA, toA);
    const after = linesInRange(tr.state.doc, fromB, toB);
    if (before.length !== after.length) return;

    for (let i = 0; i < after.length; i++) {
      const prev = parseTaskState(before[i].text);
      const next = parseTaskState(after[i].text);
      if (!prev || !next || prev.state === next.state || prev.content !== next.content) continue;
      toggles.push({
        state: next.state,
        content: next.content,
        lineNumber: after[i].number,
        from: after[i].from,
        originalLine: after[i].text,
      });
    }
  });

  return toggles;
};

/**
 * Notifies the task handler when a checkbox is toggled by the user.
 * The handler runs in a microtask: CodeMirror forbids dispatching from inside
 * an update, and auto-flush needs to dispatch a follow-up deletion.
 */
export const taskToggleListener = (getHandler: GetTaskHandler) =>
  EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;
    const toggles = update.transactions.flatMap(findTaskToggles);
    if (toggles.length === 0) return;

    // Resolve sections now, while line numbers still match this update.
    // Process bottom-up so an auto-flush deletion cannot shift a later `pos`.
    const events = toggles
      .map((toggle) => ({ ...toggle, section: findTaskSection(update.view, toggle.lineNumber) }))
      .sort((a, b) => b.from - a.from);

    queueMicrotask(() => {
      const handler = getHandler();
      if (!handler) return;
      for (const event of events) {
        if (event.state === "closed") {
          handler.onTaskClosed({
            taskContent: event.content,
            originalLine: event.originalLine,
            section: event.section,
            pos: event.from,
            view: update.view,
          });
        } else {
          handler.onTaskOpen(event.content);
        }
      }
    });
  });
