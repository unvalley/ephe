import { useState, useEffect } from "react";
import { type Snapshot, snapshotStorage } from "../snapshots/snapshot-storage";
import { type CompletedTask, taskStorage } from "../editor/tasks/task-storage";
import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { showToast } from "../../utils/components/toast";

// History data type
type HistoryData = {
  snapshots: Snapshot[];
  tasks: CompletedTask[];
  isLoading: boolean;
  handleRestoreSnapshot: (snapshot: Snapshot) => void;
  handleDeleteSnapshot: (id: string) => void;
  handleDeleteAllSnapshots: () => void;
  handleDeleteTask: (id: string) => void;
  handleDeleteAllTasks: () => void;
};

export const useHistoryData = (isOpen: boolean): HistoryData => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = () => {
    try {
      setSnapshots(
        snapshotStorage.getAll().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      );
    } catch (snapshotError) {
      console.error("Error loading snapshots:", snapshotError);
      setSnapshots([]);
    }
    try {
      setTasks(
        taskStorage.getAll().sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
      );
    } catch (taskError) {
      console.error("Error loading tasks:", taskError);
      setTasks([]);
    }
    setIsLoading(false);
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

  // The modal stays mounted while closed, so reload whenever it opens.
  // Keyed on isOpen only: loadData is recreated each render, and depending on it loops forever.
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

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

  // Handle delete all tasks
  const handleDeleteAllTasks = () => {
    try {
      taskStorage.deleteAll();
      setTasks([]);
      showToast("All tasks deleted", "success");
    } catch (error) {
      console.error("Error deleting all tasks:", error);
      showToast("Failed to delete all tasks", "error");
    }
  };

  return {
    snapshots,
    tasks,
    isLoading,
    handleRestoreSnapshot,
    handleDeleteSnapshot,
    handleDeleteAllSnapshots,
    handleDeleteTask,
    handleDeleteAllTasks,
  };
};
