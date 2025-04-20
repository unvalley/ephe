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

export interface TaskStorage {
  getAll: () => CompletedTask[];
  getById: (id: string) => CompletedTask | null;
  save: (task: CompletedTask) => void;
  deleteById: (id: string) => void;
  deleteByIdentifier: (taskIdentifier: string) => void;
  deleteAll: () => void;
  getByDate: (filter?: DateFilter) => Record<string, CompletedTask[]>;
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
  const baseStorage = createStorage<CompletedTask>(storage, LOCAL_STORAGE_KEYS.COMPLETED_TASKS);

  // Task specific operations
  const save = (task: CompletedTask): void => {
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

  const getByDate = (filter?: DateFilter): Record<string, CompletedTask[]> => {
    const tasks = baseStorage.getAll();
    const filteredTasks = filterItemsByDate(tasks, filter);
    return groupItemsByDate(filteredTasks);
  };

  return {
    ...baseStorage,
    save,
    deleteById: deleteItem,
    deleteByIdentifier,
    deleteAll: purgeAll,
    getByDate,
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
