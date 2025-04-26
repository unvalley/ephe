import type { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { taskDecoration, taskHoverField, taskMouseInteraction, type TaskHandler } from "./task-close";
import { taskKeyMap } from "./keymap";
import { taskAutoComplete } from "./auto-complete";
import { generateTaskIdentifier, type TaskStorage } from "../../tasks/task-storage";
import type { TaskAutoFlushMode } from "../../tasks/task-auto-flush";

export const createDefaultTaskHandler = (
  taskStorage: TaskStorage,
  getAutoFlushMode: () => TaskAutoFlushMode,
): TaskHandler => ({
  onTaskClosed: (taskContent: string, originalLine: string, section?: string) => {
    const taskIdentifier = generateTaskIdentifier(taskContent);
    const timestamp = new Date().toISOString();

    const task = Object.freeze({
      id: taskIdentifier,
      content: taskContent,
      originalLine,
      taskIdentifier,
      section,
      completedAt: timestamp,
    });

    taskStorage.save(task);
  },
  onTaskOpen: (taskContent: string) => {
    const taskIdentifier = generateTaskIdentifier(taskContent);
    taskStorage.deleteByIdentifier(taskIdentifier);
  },
  onToggleTask: (pos: number, isDone: boolean, view: EditorView) => {
    const autoFlushMode = getAutoFlushMode();

    if (autoFlushMode === "instant" && isDone && view) {
      try {
        const line = view.state.doc.lineAt(pos);
        view.dispatch({
          changes: {
            from: line.from,
            to: line.to + (view.state.doc.lines > line.number ? 1 : 0),
          },
        });
      } catch (e) {
        console.error("[AutoFlush Debug] Error deleting line:", e);
      }
    }
  },
});

export const createChecklistPlugin = (taskHandler: TaskHandler): Extension => {
  return [taskDecoration, taskHoverField, taskMouseInteraction(taskHandler), taskAutoComplete, taskKeyMap];
};
