import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";
import { createStorage, type DateFilter, defaultStorageProvider, type StorageProvider } from "../../../utils/storage";

export type TaskStorage = {
  getAll: () => CompletedTask[];
  getById: (id: string) => CompletedTask | null;
  save: (task: CompletedTask) => void;
  deleteById: (id: string) => void;
  deleteByIdentifier: (taskIdentifier: string) => void;
  deleteAll: () => void;
  getByDate: (filter?: DateFilter) => Record<string, CompletedTask[]>;
};
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
const createTaskStorage = (storage: StorageProvider): TaskStorage => {
  const baseStorage = createStorage<CompletedTask>(storage, LOCAL_STORAGE_KEYS.COMPLETED_TASKS);

  const deleteByIdentifier = (taskIdentifier: string): void => {
    try {
      const tasks = baseStorage.getAll();
      const updatedTasks = tasks.filter((task) => task.taskIdentifier !== taskIdentifier);
      storage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error("Error deleting task by identifier:", error);
    }
  };

  return {
    ...baseStorage,
    deleteByIdentifier,
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
