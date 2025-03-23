/**
 * Task storage utilities for saving and retrieving completed tasks
 */

// LocalStorage key for completed tasks
const COMPLETED_TASKS_KEY = 'ephe-completed-tasks';

// Completed task type
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
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `task-${Math.abs(hash)}`;
};

/**
 * Save a completed task to localStorage
 */
export const saveCompletedTask = (task: CompletedTask): void => {
  try {
    const existingTasksJson = localStorage.getItem(COMPLETED_TASKS_KEY);
    const existingTasks: CompletedTask[] = existingTasksJson ? JSON.parse(existingTasksJson) : [];
    
    localStorage.setItem(
      COMPLETED_TASKS_KEY, 
      JSON.stringify([task, ...existingTasks])
    );
  } catch (error) {
    console.error('Error saving completed task:', error);
  }
};

/**
 * Get all completed tasks from localStorage
 */
export const getCompletedTasks = (): CompletedTask[] => {
  try {
    const tasksJson = localStorage.getItem(COMPLETED_TASKS_KEY);
    return tasksJson ? JSON.parse(tasksJson) : [];
  } catch (error) {
    console.error('Error retrieving completed tasks:', error);
    return [];
  }
};

/**
 * Get completed tasks grouped by date (YYYY-MM-DD)
 */
export const getTasksByDate = (filter?: { year?: number; month?: number; day?: number }): Record<string, CompletedTask[]> => {
  const tasks = getCompletedTasks();
  const tasksByDate: Record<string, CompletedTask[]> = {};
  
  // Filter tasks if filter is provided
  const filteredTasks = tasks.filter(task => {
    if (!filter) return true;
    
    const date = new Date(task.completedAt);
    const taskYear = date.getFullYear();
    const taskMonth = date.getMonth() + 1; // JavaScript months are 0-indexed
    const taskDay = date.getDate();
    
    // Apply filters
    if (filter.year && taskYear !== filter.year) return false;
    if (filter.month && taskMonth !== filter.month) return false;
    if (filter.day && taskDay !== filter.day) return false;
    
    return true;
  });
  
  // Group filtered tasks by date
  for (const task of filteredTasks) {
    const date = new Date(task.completedAt);
    // Format date as YYYY-MM-DD in local timezone
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!tasksByDate[localDateStr]) {
      tasksByDate[localDateStr] = [];
    }
    tasksByDate[localDateStr].push(task);
  }
  
  return tasksByDate;
};

/**
 * Delete a completed task by ID
 */
export const deleteCompletedTask = (taskId: string): void => {
  try {
    const tasks = getCompletedTasks();
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(updatedTasks));
  } catch (error) {
    console.error('Error deleting completed task:', error);
  }
};

/**
 * Delete a completed task by its unique identifier
 */
export const deleteCompletedTaskByIdentifier = (taskIdentifier: string): void => {
  try {
    const tasks = getCompletedTasks();
    const updatedTasks = tasks.filter(task => task.taskIdentifier !== taskIdentifier);
    localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify(updatedTasks));
  } catch (error) {
    console.error('Error deleting completed task by identifier:', error);
  }
};

/**
 * Delete all completed tasks
 */
export const purgeCompletedTasks = (): void => {
  try {
    localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Error purging completed tasks:', error);
  }
}; 