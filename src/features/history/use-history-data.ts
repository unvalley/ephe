import { useState, useEffect, useCallback } from "react";
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
export type HistoryData = {
  snapshots: Snapshot[];
  tasks: CompletedTask[];
  groupedSnapshots: DateGroupedItems<Snapshot>;
  groupedTasks: DateGroupedItems<CompletedTask>;
  isLoading: boolean;
  handleRestoreSnapshot: (snapshot: Snapshot) => void;
  handleDeleteSnapshot: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  refresh: () => void;
};

// Helper to get date string for grouping
const getDateString = (date: Date): string => {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
};

// Function to group items by date
const groupItemsByDate = <T extends { timestamp?: string; completedAt?: string }>(
  items: T[]
): DateGroupedItems<T> => {
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
  const [groupedSnapshots, setGroupedSnapshots] = useState<DateGroupedItems<Snapshot>>({
    today: [],
    yesterday: [],
    older: [],
  });
  const [groupedTasks, setGroupedTasks] = useState<DateGroupedItems<CompletedTask>>({
    today: [],
    yesterday: [],
    older: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load data from storage
  const loadData = useCallback(() => {
    setIsLoading(true);

    // Get all snapshots with proper error handling
    try {
      const allSnapshots = snapshotStorage
        .getAll()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSnapshots(allSnapshots);
      setGroupedSnapshots(groupItemsByDate(allSnapshots));
    } catch (snapshotError) {
      console.error("Error loading snapshots:", snapshotError);
      setSnapshots([]);
      setGroupedSnapshots({ today: [], yesterday: [], older: [] });
    }

    // Get all tasks with proper error handling
    try {
      const allTasks = taskStorage
        .getAll()
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      setTasks(allTasks);
      setGroupedTasks(groupItemsByDate(allTasks));
    } catch (taskError) {
      console.error("Error loading tasks:", taskError);
      setTasks([]);
      setGroupedTasks({ today: [], yesterday: [], older: [] });
    }

    setIsLoading(false);
  }, []);

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
  }, [loadData]);

  // Handle restore snapshot
  const handleRestoreSnapshot = useCallback((snapshot: Snapshot) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, snapshot.content);
      showToast("Snapshot restored to editor", "success");
      // Force reload to update editor content
      window.location.reload();
    } catch (error) {
      console.error("Error restoring snapshot:", error);
      showToast("Failed to restore snapshot", "error");
    }
  }, []);

  // Handle delete snapshot
  const handleDeleteSnapshot = useCallback((id: string) => {
    try {
      snapshotStorage.deleteById(id);
      // Update state immediately
      const updatedSnapshots = snapshots.filter(snapshot => snapshot.id !== id);
      setSnapshots(updatedSnapshots);
      setGroupedSnapshots(groupItemsByDate(updatedSnapshots));
      showToast("Snapshot deleted", "success");
    } catch (error) {
      console.error("Error deleting snapshot:", error);
      showToast("Failed to delete snapshot", "error");
    }
  }, [snapshots]);

  // Handle delete task
  const handleDeleteTask = useCallback((id: string) => {
    try {
      taskStorage.deleteById(id);
      // Update state immediately
      const updatedTasks = tasks.filter(task => task.id !== id);
      setTasks(updatedTasks);
      setGroupedTasks(groupItemsByDate(updatedTasks));
      showToast("Task deleted", "success");
    } catch (error) {
      console.error("Error deleting task:", error);
      showToast("Failed to delete task", "error");
    }
  }, [tasks]);

  return {
    snapshots,
    tasks,
    groupedSnapshots,
    groupedTasks,
    isLoading,
    handleRestoreSnapshot,
    handleDeleteSnapshot,
    handleDeleteTask,
    refresh: loadData,
  };
}; 