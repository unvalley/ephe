import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { notifyTaskUpdate } from "../system/system-menu";

export type CompletedTask = {
  id: string;
  content: string;
  completedAt: string; // ISO string
  originalLine: string;
  taskIdentifier: string; // Unique identifier for the task
  section: string | undefined; // Section name the task belongs to
};

/**
 * Generate a unique identifier for a task based on its content
 */
export const generateTaskIdentifier = (taskContent: string): string => {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < taskContent.length; i++) {
    const char = taskContent.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `task-${Math.abs(hash)}`;
};

/**
 * Get all completed tasks from localStorage
 */
export const getCompletedTasks = (): ReadonlyArray<CompletedTask> => {
  try {
    const tasksJson = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS);
    const tasks = tasksJson ? JSON.parse(tasksJson) : [];

    // Return frozen array to ensure immutability
    return Object.freeze(tasks);
  } catch (error) {
    console.error("Error retrieving completed tasks:", error);
    return Object.freeze([]);
  }
};

/**
 * Save a completed task to localStorage
 */
export const saveCompletedTask = (task: CompletedTask): void => {
  try {
    // Get current tasks as immutable array
    const existingTasks = getCompletedTasks();

    // Create a new array with the task added at the beginning
    const updatedTasks = Object.freeze([task, ...existingTasks]);

    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(updatedTasks));
    notifyTaskUpdate();
  } catch (error) {
    console.error("Error saving completed task:", error);
  }
};

/**
 * Delete a completed task by ID
 */
export const deleteCompletedTask = (taskId: string): void => {
  try {
    const tasks = getCompletedTasks();

    // Create new array without the task to delete
    const updatedTasks = Object.freeze(tasks.filter((task) => task.id !== taskId));

    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(updatedTasks));
    notifyTaskUpdate();
  } catch (error) {
    console.error("Error deleting completed task:", error);
  }
};

/**
 * Re-open (delete) a completed task by its unique identifier
 */
export const reOpenTaskByIdentifier = (taskIdentifier: string): void => {
  try {
    const tasks = getCompletedTasks();

    // Create new array without the task to delete
    const updatedTasks = Object.freeze(tasks.filter((task) => task.taskIdentifier !== taskIdentifier));

    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(updatedTasks));
    notifyTaskUpdate();
  } catch (error) {
    console.error("Error deleting completed task by identifier:", error);
  }
};

/**
 * Get completed tasks grouped by date (YYYY-MM-DD)
 */
export const getTasksByDate = (filter?: {
  year?: number;
  month?: number;
  day?: number;
}): Record<string, CompletedTask> => {
  const tasks = getCompletedTasks();
  const tasksByDate: Record<string, CompletedTask[]> = {};

  for (const task of tasks) {
    const completedDate = new Date(task.completedAt);

    // Apply filter if provided
    if (filter) {
      if (filter.year && completedDate.getFullYear() !== filter.year) continue;
      if (filter.month && completedDate.getMonth() + 1 !== filter.month) continue; // +1 because getMonth() is 0-indexed
      if (filter.day && completedDate.getDate() !== filter.day) continue;
    }

    // Get date string in YYYY-MM-DD format
    const localeDateStr = completedDate.toISOString().split("T")[0];

    if (!tasksByDate[localeDateStr]) {
      tasksByDate[localeDateStr] = [];
    }

    // Immutably add task to the array
    tasksByDate[localeDateStr] = [...tasksByDate[localeDateStr], task];
  }

  // Freeze each task array and the overall object for immutability
  for (const date in tasksByDate) {
    tasksByDate[date] = tasksByDate[date];
  }

  return tasksByDate;
};

/**
 * Delete all completed tasks
 */
export const purgeCompletedTasks = (): void => {
  try {
    // Create empty immutable array
    const emptyTasks = Object.freeze([]);

    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(emptyTasks));
    notifyTaskUpdate();
  } catch (error) {
    console.error("Error purging completed tasks:", error);
  }
};
