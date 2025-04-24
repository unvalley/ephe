import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { DateFilter } from "../../../utils/storage";
import { filterItemsByDate, groupItemsByDate } from "../../../utils/storage";
import { useAtom } from "jotai";
import { useCallback } from "react";

export type CompletedTask = {
  id: string;
  content: string;
  completedAt: string; // ISO string
  originalLine: string;
  taskIdentifier: string; // Unique identifier for the task
  section: string | undefined; // Section name the task belongs to
};

// Create a storage implementation with proper subscribe method for cross-tab sync
const tasksJSONStorage = createJSONStorage<CompletedTask[]>(() => localStorage, {
  // Add optional reviver/replacer if needed
});

// Create the atom for task storage - this is the single source of truth
export const tasksAtom = atomWithStorage<CompletedTask[]>(
  LOCAL_STORAGE_KEYS.COMPLETED_TASKS,
  [],
  tasksJSONStorage,
  { getOnInit: true },
);

// Create a hook for task operations that uses the atom
export const useTaskOperations = () => {
  const [tasks, setTasks] = useAtom(tasksAtom);

  const getAll = useCallback((): CompletedTask[] => {
    return tasks;
  }, [tasks]);

  const getById = useCallback((id: string): CompletedTask | null => {
    return tasks.find(task => task.id === id) || null;
  }, [tasks]);

  const save = useCallback((task: CompletedTask): void => {
    setTasks((currentTasks) => [task, ...currentTasks]);
  }, [setTasks]);

  const deleteById = useCallback((id: string): void => {
    setTasks((currentTasks) => currentTasks.filter(task => task.id !== id));
  }, [setTasks]);

  const deleteByIdentifier = useCallback((taskIdentifier: string): void => {
    setTasks((currentTasks) => currentTasks.filter(task => task.taskIdentifier !== taskIdentifier));
  }, [setTasks]);

  const deleteAll = useCallback((): void => {
    setTasks([]);
  }, [setTasks]);

  const getByDate = useCallback((filter?: DateFilter): Record<string, CompletedTask[]> => {
    const filteredTasks = filterItemsByDate<CompletedTask>(tasks, filter);
    return groupItemsByDate<CompletedTask>(filteredTasks);
  }, [tasks]);

  return {
    tasks,
    getAll,
    getById,
    save,
    deleteById,
    deleteByIdentifier,
    deleteAll,
    getByDate
  };
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

// Legacy interface for backward compatibility
export interface TaskStorage {
  getAll: () => CompletedTask[];
  getById: (id: string) => CompletedTask | null;
  save: (task: CompletedTask) => void;
  deleteById: (id: string) => void;
  deleteByIdentifier: (taskIdentifier: string) => void;
  deleteAll: () => void;
  getByDate: (filter?: DateFilter) => Record<string, CompletedTask[]>;
}

// For backward compatibility with non-React code
export const taskStorage: TaskStorage = {
  // This implementation forwards operations to the atom directly
  // It's not ideal for non-React contexts but acts as a bridge during transition
  getAll: () => {
    const tasksJson = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS);
    return tasksJson ? JSON.parse(tasksJson) : [];
  },
  
  getById: (id: string) => {
    const tasks = taskStorage.getAll();
    return tasks.find(task => task.id === id) || null;
  },
  
  save: (task: CompletedTask) => {
    // Read current state from localStorage
    const tasks = taskStorage.getAll();
    // Update localStorage directly - the atom will be updated via storage events
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify([task, ...tasks]));
  },
  
  deleteById: (id: string) => {
    const tasks = taskStorage.getAll();
    const updatedTasks = tasks.filter(task => task.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(updatedTasks));
  },
  
  deleteByIdentifier: (taskIdentifier: string) => {
    try {
      const tasks = taskStorage.getAll();
      const updatedTasks = tasks.filter(task => task.taskIdentifier !== taskIdentifier);
      localStorage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error("Error deleting task by identifier:", error);
    }
  },
  
  deleteAll: () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify([]));
  },
  
  getByDate: (filter?: DateFilter) => {
    const tasks = taskStorage.getAll();
    const filteredTasks = filterItemsByDate<CompletedTask>(tasks, filter);
    return groupItemsByDate<CompletedTask>(filteredTasks);
  }
};

