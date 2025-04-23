import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import {
  type StorageProvider,
  createBrowserLocalStorage,
  createStorage,
  type DateFilter,
  filterItemsByDate,
  groupItemsByDate,
  defaultStorageProvider,
} from "../../utils/storage";

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

export const snapshotStorage = createSnapshotStorage(defaultStorageProvider);

export type Snapshot = {
  id: string;
  timestamp: string;
  content: string;
  charCount: number;
};
