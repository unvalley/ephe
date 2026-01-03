import {
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  Decoration,
  type DecorationSet,
  type PluginValue,
} from "@codemirror/view";
import { StateEffect, StateField, RangeSetBuilder } from "@codemirror/state";
import { findTaskSection } from "./task-section-utils";
import type { OnTaskClosed } from ".";

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
};

// Effect to track the task being hovered over
const hoverTask = StateEffect.define<TaskInfo | null>();

// Effect emitted when a task is toggled via mouse interaction.
const toggleTaskEffect = StateEffect.define<{ pos: number; checked: boolean }>();

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

type TaskPluginValue = PluginValue & {
  taskHandler?: TaskHandler;
};

// Single global task handler instance
let globalTaskHandler: TaskHandler | undefined;

export const registerTaskHandler = (handler: TaskHandler | undefined): void => {
  globalTaskHandler = handler;
};

export const getRegisteredTaskHandler = (): TaskHandler | undefined => {
  return globalTaskHandler;
};

export const taskDecoration = ViewPlugin.fromClass(
  class {
    taskes: TaskInfo[] = [];
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.taskes = this.findAllTaskes(view);
      this.decorations = this.createBaseDecorations(this.taskes);
    }

    // Detect all tasks in the document
    findAllTaskes(view: EditorView): TaskInfo[] {
      const result: TaskInfo[] = [];
      const { state } = view;
      const { doc } = state;

      // Process visible lines only for performance
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const match = line.text.match(taskItemRegex);

        if (match) {
          // Search for the entire task pattern to determine the exact position
          const matchIndex = match.index || 0;
          const prefixLength = match[1].length;

          // Calculate the position of '['
          const taskStartPos = matchIndex + prefixLength;
          const from = line.from + taskStartPos;
          const contentPos = from + 1; // next of '['
          const to = from + 3; // '[' + content + ']' = 3 chars

          const checkChar = match[2];

          result.push({
            from,
            to,
            contentPos,
            checked: checkChar === "x" || checkChar === "X",
            line: i,
          });
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

    // Detect tasks when the document changes
    update(update: ViewUpdate) {
      const handler = getRegisteredTaskHandler();

      // Handle explicit toggle events (e.g., click on checkbox)
      if (handler) {
        for (const tr of update.transactions) {
          for (const effect of tr.effects) {
            if (!effect.is(toggleTaskEffect)) continue;

            const { pos, checked } = effect.value;
            const line = update.view.state.doc.lineAt(pos);
            const match = line.text.match(taskItemRegex);
            if (!match) continue;

            const matchIndex = match.index || 0;
            const prefixLength = match[1].length;
            const taskStartPos = matchIndex + prefixLength;
            const taskEndIndex = taskStartPos + 3; // '[ ]' or '[x]' is 3 chars
            const taskContent = line.text.substring(taskEndIndex).trim();
            const section = findTaskSection(update.view, line.number);
            const taskPos = line.from + taskStartPos;

            if (checked) {
              handler.onTaskClosed({
                taskContent,
                originalLine: line.text,
                section,
                pos: taskPos,
                view: update.view,
              });
            } else {
              handler.onTaskOpen(taskContent);
            }
          }
        }
      }

      if (update.docChanged) {
        // Performance optimization: only re-detect tasks if the document has changed
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

export const taskMouseInteraction = (taskHandler?: TaskHandler) => {
  return ViewPlugin.fromClass(
    class implements TaskPluginValue {
      taskHandler: TaskHandler | undefined;

      constructor(readonly view: EditorView) {
        this.taskHandler = taskHandler;
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

          return {
            from,
            to,
            contentPos,
            checked: checkChar === "x" || checkChar === "X",
            line: line.number,
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
          effects: toggleTaskEffect.of({ pos: task.from, checked: !task.checked }),
          userEvent: "input.toggleTask",
        });
      }
    },
  );
};
