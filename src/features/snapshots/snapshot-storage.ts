import type { Snapshot } from "./snapshot-types";
import { LOCAL_STORAGE_KEYS } from "../../utils/constants";

/**
 * Save a snapshot to localStorage
 */
export const saveSnapshot = (snapshot: Omit<Snapshot, "id" | "timestamp">): void => {
  try {
    const now = new Date();
    const id = `snapshot-${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`;

    const newSnapshot: Snapshot = {
      ...snapshot,
      id,
      timestamp: now.toISOString(),
    };

    const existingSnapshotsJson = localStorage.getItem(LOCAL_STORAGE_KEYS.SNAPSHOTS);
    const existingSnapshots: Snapshot[] = existingSnapshotsJson ? JSON.parse(existingSnapshotsJson) : [];

    localStorage.setItem(LOCAL_STORAGE_KEYS.SNAPSHOTS, JSON.stringify([newSnapshot, ...existingSnapshots]));
  } catch (error) {
    console.error("Error saving snapshot:", error);
  }
};

/**
 * Get all snapshots from localStorage
 */
export const getSnapshots = (): Snapshot[] => {
  try {
    const snapshotsJson = localStorage.getItem(LOCAL_STORAGE_KEYS.SNAPSHOTS);
    return snapshotsJson ? JSON.parse(snapshotsJson) : [];
  } catch (error) {
    console.error("Error retrieving snapshots:", error);
    return [];
  }
};

/**
 * Get snapshots grouped by date (YYYY-MM-DD)
 */
export const getSnapshotsByDate = (filter?: {
  year?: number;
  month?: number;
  day?: number;
}): Record<string, Snapshot[]> => {
  const snapshots = getSnapshots();
  const snapshotsByDate: Record<string, Snapshot[]> = {};

  // Filter snapshots if filter is provided
  const filteredSnapshots = snapshots.filter((snapshot) => {
    if (!filter) return true;

    const date = new Date(snapshot.timestamp);
    const snapshotYear = date.getFullYear();
    const snapshotMonth = date.getMonth() + 1; // JavaScript months are 0-indexed
    const snapshotDay = date.getDate();

    // Apply filters
    if (filter.year && snapshotYear !== filter.year) return false;
    if (filter.month && snapshotMonth !== filter.month) return false;
    if (filter.day && snapshotDay !== filter.day) return false;

    return true;
  });

  // Group filtered snapshots by date
  for (const snapshot of filteredSnapshots) {
    const date = new Date(snapshot.timestamp);
    // Format date as YYYY-MM-DD in local timezone
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    if (!snapshotsByDate[localDateStr]) {
      snapshotsByDate[localDateStr] = [];
    }
    snapshotsByDate[localDateStr].push(snapshot);
  }

  return snapshotsByDate;
};

/**
 * Get a specific snapshot by ID
 */
export const getSnapshotById = (id: string): Snapshot | null => {
  const snapshots = getSnapshots();
  return snapshots.find((snapshot) => snapshot.id === id) || null;
};

/**
 * Delete a snapshot by ID
 */
export const deleteSnapshot = (id: string): void => {
  try {
    const snapshots = getSnapshots();
    const updatedSnapshots = snapshots.filter((snapshot) => snapshot.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SNAPSHOTS, JSON.stringify(updatedSnapshots));
  } catch (error) {
    console.error("Error deleting snapshot:", error);
  }
};

/**
 * Delete all snapshots
 */
export const purgeAllSnapshots = (): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SNAPSHOTS, JSON.stringify([]));
  } catch (error) {
    console.error("Error purging snapshots:", error);
  }
};
