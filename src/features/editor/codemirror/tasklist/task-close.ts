import {
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  Decoration,
  type DecorationSet,
  type PluginValue,
} from "@codemirror/view";
import { StateEffect, StateField, RangeSetBuilder, type Line } from "@codemirror/state";
import { findTaskSection } from "./task-section-utils";
import type { OnTaskClosed } from ".";

export type TaskHandler = {
  onTaskClosed: ({ taskContent, originalLine, section }: OnTaskClosed) => void;
  onTaskOpen: (taskContent: string) => void;
};

// Differs from TASK_LINE_REGEX in task-list-utils on purpose: no padding inside the brackets, any spacing after the bullet
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

type TaskPluginValue = PluginValue & {
  taskHandler?: TaskHandler;
};

// Single global task handler instance
let globalTaskHandler: TaskHandler | undefined;

export const registerTaskHandler = (handler: TaskHandler | undefined): void => {
  globalTaskHandler = handler;
};

const getRegisteredTaskHandler = (): TaskHandler | undefined => {
  return globalTaskHandler;
};

// Utility to generate a unique key for a task
const getTaskKey = (lineNumber: number, content: string): string => {
  return `${lineNumber}:${content.trim()}`;
};

const parseTaskInfo = (line: Line): TaskInfo | null => {
  const match = line.text.match(taskItemRegex);
  if (!match) return null;

  // Position of '['
  const taskStartPos = (match.index || 0) + match[1].length;
  const from = line.from + taskStartPos;
  const checkChar = match[2];
  return {
    from,
    to: from + 3, // '[' + content + ']' = 3 chars
    contentPos: from + 1, // next of '['
    checked: checkChar === "x" || checkChar === "X",
    line: line.number,
    key: getTaskKey(line.number, line.text.substring(taskStartPos + 3)),
  };
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
          const task = parseTaskInfo(line);
          if (task) result.push(task);

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
        const task = parseTaskInfo(this.view.state.doc.lineAt(pos));
        return task && pos >= task.from && pos < task.to ? task : null;
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

        // Prefer the registered handler so a flush mode change applies without rebuilding the editor
        const handler = getRegisteredTaskHandler() ?? this.taskHandler;
        if (!handler) return;

        const line = this.view.state.doc.lineAt(task.from);
        const taskContent = line.text.substring(task.to - line.from).trim();

        if (task.checked) {
          handler.onTaskOpen(taskContent);
          return;
        }

        handler.onTaskClosed({
          taskContent,
          originalLine: line.text,
          section: findTaskSection(this.view, line.number),
          pos: task.from,
          view: this.view,
        });
      }
    },
  );
};
