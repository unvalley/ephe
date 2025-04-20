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

export interface TaskHandler {
  onTaskClosed: (taskContent: string, originalLine: string, section?: string) => void;
  onTaskOpen: (taskContent: string) => void;
}

// use utils
const taskItemRegex = /^(\s*[-*]\s+)\[([\ xX])\]/;

type TaskInfo = {
  from: number; // タスク全体の開始位置 ('[')
  to: number; // タスク全体の終了位置 (']'の次)
  contentPos: number; // タスク内容の位置 ('['の次)
  checked: boolean; // チェック状態
  line: number; // Line number containing the task
  key: string; // Unique identifier for the task
};

// ホバー中のタスクを追跡するための Effect
const hoverTask = StateEffect.define<TaskInfo | null>();

// すべてのタスクに適用するポインタスタイルのデコレーション
const taskBaseStyle = Decoration.mark({
  class: "cursor-pointer",
  inclusive: false,
});

// ホバー時にだけ適用する追加のハイライトデコレーション
const taskHoverStyle = Decoration.mark({
  class: "cm-task-hover",
  inclusive: false,
});

export const TASK_TOGGLE_EVENT = "ephe:task-change";

interface TaskPluginValue extends PluginValue {
  taskHandler?: TaskHandler;
}

// Single global task handler instance
let globalTaskHandler: TaskHandler | undefined;

export const registerTaskHandler = (handler: TaskHandler | undefined): void => {
  globalTaskHandler = handler;
};

export const getRegisteredTaskHandler = (): TaskHandler | undefined => {
  return globalTaskHandler;
};

// Utility to generate a unique key for a task
const getTaskKey = (lineNumber: number, content: string): string => {
  return `${lineNumber}:${content.trim()}`;
};

// Performance optimization: create a set to track tasks that have already triggered events
// to avoid duplicate processing
const processedTaskChanges = new Set<string>();

export const taskDecoration = ViewPlugin.fromClass(
  class {
    taskes: TaskInfo[] = [];
    decorations: DecorationSet;
    prevTaskStates: Map<string, boolean> = new Map(); // Track previous task states by key
    pendingChanges: boolean = false;
    changeTimer: number | null = null;

    constructor(view: EditorView) {
      this.taskes = this.findAllTaskes(view);
      this.decorations = this.createBaseDecorations(this.taskes);

      // Initialize previous states
      for (const task of this.taskes) {
        this.prevTaskStates.set(task.key, task.checked);
      }
    }

    // ドキュメント内のすべてのタスクを検出する
    findAllTaskes(view: EditorView): TaskInfo[] {
      const result: TaskInfo[] = [];
      const { state } = view;
      const { doc } = state;

      // 各行に対してタスクを検索 - only process visible lines for performance
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const match = line.text.match(taskItemRegex);

        if (match) {
          // タスクのパターン全体を検索して正確な位置を特定
          const matchIndex = match.index || 0;
          const prefixLength = match[1].length;

          // '[' の位置を計算
          const taskStartPos = matchIndex + prefixLength;
          const from = line.from + taskStartPos;
          const contentPos = from + 1; // '[' の次、つまり内容の位置
          const to = from + 3; // '[' + 内容 + ']' = 3文字分

          const checkChar = match[2];
          const taskContent = line.text.substring(matchIndex + prefixLength + 3).trim();

          result.push({
            from,
            to,
            contentPos,
            checked: checkChar === "x" || checkChar === "X",
            line: i,
            key: getTaskKey(i, taskContent),
          });
        }
      }
      return result;
    }

    // すべてのタスクにベースとなるカーソルポインタ装飾を作成
    createBaseDecorations(taskes: TaskInfo[]): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of taskes) {
        builder.add(from, to, taskBaseStyle);
      }
      return builder.finish();
    }

    // Process changes in a batched, debounced way
    processTaskChanges(update: ViewUpdate) {
      const changedTasks: TaskInfo[] = [];

      // Collect tasks that have changed state
      for (const task of this.taskes) {
        const prevState = this.prevTaskStates.get(task.key);

        // If we have a previous state and it changed
        if (prevState !== undefined && prevState !== task.checked && !processedTaskChanges.has(task.key)) {
          changedTasks.push(task);
          // Mark this task as processed to avoid duplicate events
          processedTaskChanges.add(task.key);

          // Cleanup processed tasks after a delay to prevent memory leaks
          setTimeout(() => {
            processedTaskChanges.delete(task.key);
          }, 1000);
        }

        // Update the previous state
        this.prevTaskStates.set(task.key, task.checked);
      }

      // Process changed tasks
      if (changedTasks.length > 0) {
        let hasDispatchedEvent = false;

        for (const task of changedTasks) {
          try {
            const line = update.view.state.doc.line(task.line);
            const match = line.text.match(taskItemRegex);

            if (match) {
              const matchIndex = match.index || 0;
              const prefixLength = match[1].length;
              const taskEndIndex = matchIndex + prefixLength + 3; // '[ ]' or '[x]' is 3 chars
              const taskContent = line.text.substring(taskEndIndex).trim();
              const section = findTaskSection(update.view, task.line);

              // Use the global task handler
              const handler = getRegisteredTaskHandler();

              // Dispatch the appropriate event based on the task state change
              if (task.checked && handler) {
                // If task is being checked, call the handler
                handler.onTaskClosed(taskContent, line.text, section);
                hasDispatchedEvent = true;
              } else if (!task.checked && handler) {
                // If task is being unchecked, call the handler
                handler.onTaskOpen(taskContent);
                hasDispatchedEvent = true;
              }
            }
          } catch (e) {
            console.warn("Error processing task change:", e);
          }
        }

        // Only dispatch one event no matter how many tasks changed
        if (hasDispatchedEvent) {
          window.dispatchEvent(new CustomEvent(TASK_TOGGLE_EVENT));
        }
      }
    }

    // ドキュメントが変更されたときにタスクを再検出
    update(update: ViewUpdate) {
      if (update.docChanged) {
        // Performance optimization: only re-detect tasks if the document has changed
        this.taskes = this.findAllTaskes(update.view);
        this.decorations = this.createBaseDecorations(this.taskes);

        // Performance optimization: Debounce task state change processing to avoid
        // excessive processing during rapid edits
        if (this.changeTimer !== null) {
          window.clearTimeout(this.changeTimer);
        }

        this.changeTimer = window.setTimeout(() => {
          this.processTaskChanges(update);
          this.changeTimer = null;
        }, 50); // 50ms debounce
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
        try {
          const line = this.view.state.doc.lineAt(pos);
          const match = line.text.match(taskItemRegex);
          if (!match) return null;

          const matchIndex = match.index || 0;
          const prefixLength = match[1].length;
          const taskStartPos = matchIndex + prefixLength;
          const from = line.from + taskStartPos;
          const contentPos = from + 1;
          const to = from + 3; // ']' の次の位置

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
        } catch (e) {
          // エラー処理
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
        if (pos === null) return;

        const task = this.getTaskAt(pos);
        if (!task) return;

        event.preventDefault();
        const newChar = task.checked ? " " : "x";

        try {
          // Apply the toggle
          this.view.dispatch({
            changes: {
              from: task.contentPos,
              to: task.contentPos + 1, // 中身の1文字だけを対象
              insert: newChar,
            },
            userEvent: "input.toggleTask",
          });
        } catch (e) {
          console.warn("Failed to toggle task:", e);
        }
      }
    },
  );
};
