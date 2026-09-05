import type { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import {
  type GetTaskHandler,
  type TaskHandler,
  taskDecoration,
  taskHoverField,
  taskMouseInteraction,
  taskToggleListener,
} from "./task-close";
import { taskKeyMap } from "./keymap";
import { taskAutoComplete } from "./auto-complete";
import { generateTaskIdentifier, type TaskStorage } from "../../tasks/task-storage";
import type { TaskAutoFlushMode } from "../../../../utils/hooks/use-task-auto-flush";

export type OnTaskClosed = {
  taskContent: string;
  originalLine: string;
  section?: string;
  pos: number; // start of the closed task line, used by auto-flush
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
    if (taskAutoFlushMode === "instant") {
      try {
        const line = view.state.doc.lineAt(pos);
        view.dispatch({
          changes: {
            from: line.from,
            to: line.to + (view.state.doc.lines > line.number ? 1 : 0),
          },
          // Tagged as a delete so the editor persists the flushed document.
          userEvent: "delete.taskAutoFlush",
        });
      } catch (e) {
        console.error("Error auto-flushing task line:", e);
      }
    }

    // Save
    const task = Object.freeze({
      // Same content can be completed more than once; keep ids distinct.
      id: `${taskIdentifier}-${Date.now()}`,
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

export const createChecklistPlugin = (getTaskHandler: GetTaskHandler): Extension => {
  return [
    taskDecoration,
    taskHoverField,
    taskMouseInteraction(),
    taskToggleListener(getTaskHandler),
    taskAutoComplete,
    taskKeyMap,
  ];
};
