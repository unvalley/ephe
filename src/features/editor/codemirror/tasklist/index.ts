import type { Extension } from "@codemirror/state";
import { taskDecoration, taskHoverField, taskMouseInteraction, type TaskHandler } from "./task-close";
import { taskKeyMap } from "./keymap";
import { taskAutoComplete } from "./auto-complete";
import { generateTaskIdentifier, type TaskStorage } from "../../tasks/task-storage";

export const createDefaultTaskHandler = (taskStorage: TaskStorage): TaskHandler => ({
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
});

export const createChecklistPlugin = (taskHandler: TaskHandler): Extension => {
  return [taskDecoration, taskHoverField, taskMouseInteraction(taskHandler), taskAutoComplete, taskKeyMap];
};
