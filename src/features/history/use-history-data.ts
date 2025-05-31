import { useState, useEffect } from "react";
import { type Snapshot, snapshotStorage } from "../snapshots/snapshot-storage";
import { type CompletedTask, taskStorage } from "../editor/tasks/task-storage";
import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { showToast } from "../../utils/components/toast";

// Type definition for grouped items
export type DateGroupedItems<T> = {
  today: T[];
  yesterday: T[];
  older: { date: string; items: T[] }[];
};

// History data type
type HistoryData = {
  snapshots: Snapshot[];
  tasks: CompletedTask[];
  groupedSnapshots: DateGroupedItems<Snapshot>;
  groupedTasks: DateGroupedItems<CompletedTask>;
  isLoading: boolean;
  handleRestoreSnapshot: (snapshot: Snapshot) => void;
  handleDeleteSnapshot: (id: string) => void;
  handleDeleteAllSnapshots: () => void;
  handleDeleteTask: (id: string) => void;
  refresh: () => void;
};

// Cache for date strings to avoid recreating them repeatedly
const dateStringCache = new Map<string, string>();

// Helper to get date string for grouping with caching
const getDateString = (date: Date): string => {
  const time = date.getTime();
  const cacheKey = `date_${time}`;

  if (dateStringCache.has(cacheKey)) {
    return dateStringCache.get(cacheKey)!;
  }

  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  dateStringCache.set(cacheKey, dateStr);

  // Cleanup cache if it gets too large
  if (dateStringCache.size > 100) {
    // Get the oldest keys and remove them
    const keys = Array.from(dateStringCache.keys()).slice(0, 50);
    keys.forEach((key) => dateStringCache.delete(key));
  }

  return dateStr;
};

// Function to group items by date
const groupItemsByDate = <T extends { timestamp?: string; completedAt?: string }>(items: T[]): DateGroupedItems<T> => {
  const now = new Date();
  const today = getDateString(now);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getDateString(yesterday);

  const result: DateGroupedItems<T> = {
    today: [],
    yesterday: [],
    older: [],
  };

  // Temporary storage for older dates
  const olderDates: Record<string, T[]> = {};

  items.forEach((item) => {
    // Get the date string from item (handle both snapshot and task)
    const dateStr = item.timestamp
      ? getDateString(new Date(item.timestamp))
      : item.completedAt
        ? getDateString(new Date(item.completedAt))
        : "";

    if (dateStr === today) {
      result.today.push(item);
    } else if (dateStr === yesterdayStr) {
      result.yesterday.push(item);
    } else if (dateStr) {
      // Group by date for older items
      if (!olderDates[dateStr]) {
        olderDates[dateStr] = [];
      }
      olderDates[dateStr].push(item);
    }
  });

  // Convert older dates to array and sort by date (newest first)
  result.older = Object.entries(olderDates)
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return result;
};

export const useHistoryData = (): HistoryData => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const groupedSnapshots = groupItemsByDate(snapshots);
  const groupedTasks = groupItemsByDate(tasks);

  // Load data from storage with optimizations
  const loadData = () => {
    setIsLoading(true);
    let loadingComplete = false;

    // Create a timeout to ensure we don't show loading state for too long
    const loadingTimeout = setTimeout(() => {
      if (!loadingComplete) {
        setIsLoading(false);
      }
    }, 500);

    // Performance optimization: Use promise.all to load data in parallel
    Promise.all([
      // Load snapshots with caching
      new Promise<void>((resolve) => {
        try {
          const allSnapshots = snapshotStorage
            .getAll()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setSnapshots(allSnapshots);
        } catch (snapshotError) {
          console.error("Error loading snapshots:", snapshotError);
          setSnapshots([]);
        }
        resolve();
      }),

      // Load tasks with caching
      new Promise<void>((resolve) => {
        try {
          const allTasks = taskStorage
            .getAll()
            .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
          setTasks(allTasks);
        } catch (taskError) {
          console.error("Error loading tasks:", taskError);
          setTasks([]);
        }
        resolve();
      }),
    ]).then(() => {
      loadingComplete = true;
      clearTimeout(loadingTimeout);
      setIsLoading(false);
    });
  };

  // Initialize data
  useEffect(() => {
    loadData();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes("snapshot") || e.key?.includes("task")) {
        loadData();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Handle restore snapshot
  const handleRestoreSnapshot = (snapshot: Snapshot) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, snapshot.content);
      // Dispatch a custom event instead of reloading
      window.dispatchEvent(
        new CustomEvent("ephe:content-restored", {
          detail: { content: snapshot.content },
        }),
      );
      showToast("Snapshot restored to editor", "success");
    } catch (error) {
      console.error("Error restoring snapshot:", error);
      showToast("Failed to restore snapshot", "error");
    }
  };

  // Handle delete snapshot
  const handleDeleteSnapshot = (id: string) => {
    try {
      snapshotStorage.deleteById(id);
      const updatedSnapshots = snapshots.filter((snapshot) => snapshot.id !== id);
      setSnapshots(updatedSnapshots);
      showToast("Snapshot deleted", "success");
    } catch (error) {
      console.error("Error deleting snapshot:", error);
      showToast("Failed to delete snapshot", "error");
    }
  };

  // Handle delete task
  const handleDeleteTask = (id: string) => {
    try {
      taskStorage.deleteById(id);
      const updatedTasks = tasks.filter((task) => task.id !== id);
      setTasks(updatedTasks);
      showToast("Task deleted", "success");
    } catch (error) {
      console.error("Error deleting task:", error);
      showToast("Failed to delete task", "error");
    }
  };

  // Handle delete all snapshots
  const handleDeleteAllSnapshots = () => {
    try {
      snapshotStorage.deleteAll();
      setSnapshots([]);
      showToast("All snapshots deleted", "success");
    } catch (error) {
      console.error("Error deleting all snapshots:", error);
      showToast("Failed to delete all snapshots", "error");
    }
  };

  return {
    snapshots,
    tasks,
    groupedSnapshots,
    groupedTasks,
    isLoading,
    handleRestoreSnapshot,
    handleDeleteSnapshot,
    handleDeleteAllSnapshots,
    handleDeleteTask,
    refresh: loadData,
  };
};
