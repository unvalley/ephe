import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { showToast } from "../../utils/components/toast";
import { type StorageProvider, createStorage, type DateFilter, defaultStorageProvider } from "../../utils/storage";

type SnapshotStorage = {
  getAll: () => Snapshot[];
  getById: (id: string) => Snapshot | null;
  save: (snapshot: Omit<Snapshot, "id" | "timestamp">) => void;
  deleteById: (id: string) => void;
  deleteAll: () => void;
  getByDate: (filter?: DateFilter) => Record<string, Snapshot[]>;
};

// Snapshot Storage factory function
const createSnapshotStorage = (storage: StorageProvider): SnapshotStorage => {
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

  return {
    ...baseStorage,
    save,
  };
};

export const snapshotStorage = createSnapshotStorage(defaultStorageProvider);

export type Snapshot = {
  id: string;
  timestamp: string;
  content: string;
  charCount: number;
};

/** Saves `content` as a snapshot and reports the result with a toast. Returns whether it was saved. */
export const saveSnapshotWithToast = (content: string): boolean => {
  if (!content) {
    showToast("No content to save", "error");
    return false;
  }
  try {
    snapshotStorage.save({ content, charCount: content.length });
    showToast("Snapshot saved", "default");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    showToast(`Error saving snapshot: ${message}`, "error");
    return false;
  }
};
