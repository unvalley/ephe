import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import {
  StorageProvider,
  createBrowserLocalStorage,
  createStorage,
  DateFilter,
  filterItemsByDate,
  groupItemsByDate,
  defaultStorageProvider,
} from "../../utils/storage";
import type { Snapshot } from "./snapshot-types";

interface SnapshotStorage {
  getAll: () => Snapshot[];
  getById: (id: string) => Snapshot | null;
  save: (snapshot: Omit<Snapshot, "id" | "timestamp">) => void;
  deleteById: (id: string) => void;
  deleteAll: () => void;
  getByDate: (filter?: DateFilter) => Record<string, Snapshot[]>;
}

// Snapshot Storage factory function
const createSnapshotStorage = (storage: StorageProvider = createBrowserLocalStorage()): SnapshotStorage => {
  const baseStorage = createStorage<Snapshot>(storage, LOCAL_STORAGE_KEYS.SNAPSHOTS);

  const save = (snapshot: Omit<Snapshot, "id" | "timestamp">): void => {
    const now = new Date();
    const id = `snapshot-${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`;

    const newSnapshot: Snapshot = {
      ...snapshot,
      id,
      timestamp: now.toISOString(),
    };

    baseStorage.save(newSnapshot);
  };

  const getByDate = (filter?: DateFilter): Record<string, Snapshot[]> => {
    const snapshots = baseStorage.getAll();
    const filteredSnapshots = filterItemsByDate(snapshots, filter);
    return groupItemsByDate(filteredSnapshots);
  };

  return {
    ...baseStorage,
    save,
    getByDate,
  };
};

const snapshotStorage = createSnapshotStorage(defaultStorageProvider);

/**
 * Save a snapshot to storage
 */
export const saveSnapshot = (snapshot: Omit<Snapshot, "id" | "timestamp">): void => {
  snapshotStorage.save(snapshot);
};

/**
 * Get all snapshots from storage
 */
export const getSnapshots = (): Snapshot[] => {
  return snapshotStorage.getAll();
};

/**
 * Get snapshots grouped by date (YYYY-MM-DD)
 */
export const getSnapshotsByDate = (filter?: DateFilter): Record<string, Snapshot[]> => {
  return snapshotStorage.getByDate(filter);
};

/**
 * Get a specific snapshot by ID
 */
export const getSnapshotById = (id: string): Snapshot | null => {
  return snapshotStorage.getById(id);
};

/**
 * Delete a snapshot by ID
 */
export const deleteSnapshot = (id: string): void => {
  snapshotStorage.deleteById(id);
};

/**
 * Delete all snapshots
 */
export const deleteAllSnapshots = (): void => {
  snapshotStorage.deleteAll();
};
