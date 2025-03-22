/**
 * Task storage utilities for saving and retrieving completed tasks
 */

export interface CompletedTask {
  id: string;
  text: string;
  completedAt: string; // ISO string
  originalLine: string;
  taskIdentifier?: string; // Unique identifier for the task
  section?: string; // Section name the task belongs to
}

const COMPLETED_TASKS_KEY = 'ephe-completed-tasks';

/**
 * Generate a unique identifier for a task based on its content and position
 */
export const generateTaskIdentifier = (text: string,checkboxIndex: number, lineNumber: number): string => {
  // Combine task text, line number, and checkbox position to create a unique identifier
  // This ensures that identical tasks on different lines are treated as separate tasks
  return `${text.trim()}_line${lineNumber}_pos${checkboxIndex}`;
};

/**
 * Save a completed task to localStorage
 */
export const saveCompletedTask = (task: Omit<CompletedTask, 'id' | 'completedAt'> & { taskIdentifier?: string }): void => {
  try {
    const now = new Date();
    const id = `task-${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const completedTask: CompletedTask = {
      ...task,
      id,
      completedAt: now.toISOString(),
    };
    
    const existingTasksJson = localStorage.getItem(COMPLETED_TASKS_KEY);
    const existingTasks: CompletedTask[] = existingTasksJson ? JSON.parse(existingTasksJson) : [];
    
    // Check if this task already exists in the completed tasks
    if (task.taskIdentifier) {
      const taskExists = existingTasks.some(existingTask => 
        existingTask.taskIdentifier === task.taskIdentifier
      );
      
      // If task already exists, don't add it again
      if (taskExists) {
        return;
      }
    }
    
    localStorage.setItem(
      COMPLETED_TASKS_KEY, 
      JSON.stringify([completedTask, ...existingTasks])
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
 * Group tasks by date (YYYY-MM-DD) with optional filtering
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
  
  // Group filtered tasks by date using local timezone
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