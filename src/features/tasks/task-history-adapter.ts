/**
 * Adapter to integrate existing task functionality with the new history system
 */

import { 
  saveHistoryItem, 
  getHistoryItemsByType,
  getHistoryItemsByDate,
  deleteHistoryItem,
  deleteHistoryItemByIdentifier,
  purgeHistoryItemsByType
} from '../history/history-storage';
import type { TaskHistoryItem } from '../history/history-types';
import type { CompletedTask } from './task-storage';

/**
 * Save a completed task to history
 */
export const saveTaskToHistory = (task: CompletedTask): void => {
  saveHistoryItem({
    id: task.id,
    type: 'task',
    content: task.content,
    originalLine: task.originalLine,
    taskIdentifier: task.taskIdentifier,
    section: task.section,
    timestamp: task.completedAt
  });
};

/**
 * Get all completed tasks from history
 */
export const getTasksFromHistory = (): CompletedTask[] => {
  const taskItems = getHistoryItemsByType<TaskHistoryItem>('task');
  
  // Convert from history format to task format
  return taskItems.map(item => ({
    id: item.id,
    content: item.content,
    completedAt: item.timestamp,
    originalLine: item.originalLine,
    taskIdentifier: item.taskIdentifier,
    section: item.section
  }));
};

/**
 * Group tasks by date from history
 */
export const getTasksByDateFromHistory = (filter?: { year?: number; month?: number; day?: number }): Record<string, CompletedTask[]> => {
  const historyByDate = getHistoryItemsByDate({
    ...filter,
    types: ['task']
  });
  
  const tasksByDate: Record<string, CompletedTask[]> = {};
  
  // Convert history items to completed tasks
  for (const date in historyByDate) {
    tasksByDate[date] = historyByDate[date]
      .filter(item => item.type === 'task')
      .map(item => {
        const taskItem = item as TaskHistoryItem;
        return {
          id: taskItem.id,
          content: taskItem.content,
          completedAt: taskItem.timestamp,
          originalLine: taskItem.originalLine,
          taskIdentifier: taskItem.taskIdentifier,
          section: taskItem.section
        };
      });
  }
  
  return tasksByDate;
};

/**
 * Delete a task from history by ID
 */
export const deleteTaskFromHistory = (taskId: string): void => {
  deleteHistoryItem(taskId);
};

/**
 * Delete a task from history by its unique identifier
 */
export const deleteTaskFromHistoryByIdentifier = (taskIdentifier: string): void => {
  deleteHistoryItemByIdentifier(taskIdentifier);
};

/**
 * Delete all tasks from history
 */
export const purgeTasksFromHistory = (): void => {
  purgeHistoryItemsByType('task');
};
