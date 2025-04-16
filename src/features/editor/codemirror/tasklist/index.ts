import { Extension } from "@codemirror/state";
import { taskDecoration, taskHoverField, taskMouseInteraction, TaskHandler } from "./close-task";
import { taskKeyMap } from "./keymap";
import { taskAutoComplete } from "./auto-complete";
import {
  generateTaskIdentifier,
  saveCompletedTask,
  reOpenTaskByIdentifier,
} from "../../../../features/tasks/task-storage";

export const createDefaultTaskHandler = (): TaskHandler => ({
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

    saveCompletedTask(task);
  },
  onTaskOpen: (taskContent: string) => {
    const taskIdentifier = generateTaskIdentifier(taskContent);
    reOpenTaskByIdentifier(taskIdentifier);
  },
});

export const createChecklistPlugin = (taskHandler: TaskHandler): Extension => {
  return [
    taskDecoration,
    taskHoverField,
    taskMouseInteraction(taskHandler),
    taskAutoComplete,
    taskKeyMap,
  ];
};
