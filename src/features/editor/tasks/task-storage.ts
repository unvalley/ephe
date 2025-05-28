import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";
import {
  createBrowserLocalStorage,
  createStorage,
  type DateFilter,
  defaultStorageProvider,
  filterItemsByDate,
  groupItemsByDate,
  type StorageProvider,
} from "../../../utils/storage";

export interface Task {
  id: string;
  content: string;
  completed: boolean;
  createdAt: number; // Unix timestamp when task was created
  completedAt?: number; // Unix timestamp when task was completed
  originalLine?: string;
  taskIdentifier?: string;
  section?: string | undefined;
}

export interface TaskStorage {
  getAll: () => Task[];
  getById: (id: string) => Task | null;
  save: (task: Task) => void;
  deleteById: (id: string) => void;
  deleteByIdentifier: (taskIdentifier: string) => void;
  deleteAll: () => void;
  getByDate: (filter?: DateFilter) => Record<string, Task[]>;
  addTask: (content: string) => Task;
  toggleTask: (id: string) => boolean;
  getCompletedTasks: () => CompletedTask[];
}
/**
 * Generate a unique identifier for a task based on its content
 */
export const generateTaskIdentifier = (taskContent: string): string => {
  let hash = 0;
  for (let i = 0; i < taskContent.length; i++) {
    const char = taskContent.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `task-${Math.abs(hash)}`;
};

// Task Storage factory function
const createTaskStorage = (storage: StorageProvider = createBrowserLocalStorage()): TaskStorage => {
  const baseStorage = createStorage<Task>(storage, LOCAL_STORAGE_KEYS.COMPLETED_TASKS);

  // Task specific operations
  const save = (task: Task): void => {
    baseStorage.save(task);
  };

  const deleteItem = (id: string): void => {
    baseStorage.deleteById(id);
  };

  const deleteByIdentifier = (taskIdentifier: string): void => {
    try {
      const tasks = baseStorage.getAll();
      const updatedTasks = tasks.filter((task) => task.taskIdentifier !== taskIdentifier);
      storage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error("Error deleting task by identifier:", error);
    }
  };

  const purgeAll = (): void => {
    baseStorage.deleteAll();
  };

  const getByDate = (filter?: DateFilter): Record<string, Task[]> => {
    const tasks = baseStorage.getAll();
    // Convert tasks to have string timestamps for filtering
    const tasksWithStringTimestamps = tasks.map((task) => ({
      ...task,
      completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : undefined,
      timestamp: task.createdAt ? new Date(task.createdAt).toISOString() : undefined,
    }));
    const filteredTasks = filterItemsByDate(tasksWithStringTimestamps, filter);
    // Convert back to original Task format
    return groupItemsByDate(filteredTasks) as Record<string, Task[]>;
  };

  const addTask = (content: string): Task => {
    const task: Task = {
      id: crypto.randomUUID(),
      content,
      completed: false,
      createdAt: Date.now(),
      taskIdentifier: generateTaskIdentifier(content),
    };
    baseStorage.save(task);
    return task;
  };

  const toggleTask = (id: string): boolean => {
    const task = baseStorage.getById(id);
    if (!task) return false;

    task.completed = !task.completed;
    if (task.completed) {
      task.completedAt = Date.now();
    } else {
      delete task.completedAt;
    }

    baseStorage.save(task);
    return true;
  };

  const getCompletedTasks = (): CompletedTask[] => {
    const tasks = baseStorage.getAll();
    return tasks
      .filter((task) => task.completed && task.completedAt)
      .map((task) => ({
        id: task.id,
        content: task.content,
        completedAt: new Date(task.completedAt!).toISOString(),
        originalLine: task.originalLine || "",
        taskIdentifier: task.taskIdentifier || generateTaskIdentifier(task.content),
        section: task.section,
      }));
  };

  return {
    ...baseStorage,
    save,
    deleteById: deleteItem,
    deleteByIdentifier,
    deleteAll: purgeAll,
    getByDate,
    addTask,
    toggleTask,
    getCompletedTasks,
  };
};

export const taskStorage = createTaskStorage(defaultStorageProvider);

export type CompletedTask = {
  id: string;
  content: string;
  completedAt: string; // ISO string
  originalLine: string;
  taskIdentifier: string; // Unique identifier for the task
  section: string | undefined; // Section name the task belongs to
};
