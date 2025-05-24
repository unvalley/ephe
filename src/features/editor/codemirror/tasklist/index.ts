import type { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { taskDecoration, taskHoverField, taskMouseInteraction, type TaskHandler } from "./task-close";
import { taskKeyMap } from "./keymap";
import { taskAutoComplete } from "./auto-complete";
import { generateTaskIdentifier, type TaskStorage } from "../../tasks/task-storage";
import type { TaskAutoFlushMode } from "../../../../utils/hooks/use-task-auto-flush";

export type OnTaskClosed = {
  taskContent: string;
  originalLine: string;
  section?: string;
  pos: number; // what ?
  view: EditorView;
};

export const createDefaultTaskHandler = (
  taskStorage: TaskStorage,
  taskAutoFlushMode: TaskAutoFlushMode,
): TaskHandler => ({
  onTaskClosed: ({ taskContent, originalLine, section, pos, view }: OnTaskClosed) => {
    const taskIdentifier = generateTaskIdentifier(taskContent);
    const timestamp = new Date().toISOString();

    // Auto Flush
    if (taskAutoFlushMode === "instant" && view) {
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

    // Save
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
});

export const createChecklistPlugin = (taskHandler: TaskHandler): Extension => {
  return [taskDecoration, taskHoverField, taskMouseInteraction(taskHandler), taskAutoComplete, taskKeyMap];
};
