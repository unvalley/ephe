import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { DateFilter } from "../../utils/storage";
import { filterItemsByDate, groupItemsByDate } from "../../utils/storage";
import { useAtom } from "jotai";
import { useCallback } from "react";

export type Snapshot = {
  id: string;
  timestamp: string;
  content: string;
  charCount: number;
};

// Create a storage implementation with proper subscribe method for cross-tab sync
const snapshotsJSONStorage = createJSONStorage<Snapshot[]>(() => localStorage, {
  // Add optional reviver/replacer if needed
});

// Create the atom for snapshot storage - this is the single source of truth
export const snapshotsAtom = atomWithStorage<Snapshot[]>(
  LOCAL_STORAGE_KEYS.SNAPSHOTS,
  [],
  snapshotsJSONStorage,
  { getOnInit: true },
);

// Create a hook for snapshot operations that uses the atom
export const useSnapshotOperations = () => {
  const [snapshots, setSnapshots] = useAtom(snapshotsAtom);

  const getAll = useCallback((): Snapshot[] => {
    return snapshots;
  }, [snapshots]);

  const getById = useCallback((id: string): Snapshot | null => {
    return snapshots.find(snapshot => snapshot.id === id) || null;
  }, [snapshots]);

  const save = useCallback((snapshot: Omit<Snapshot, "id" | "timestamp">): void => {
    const now = new Date();
    const id = `snapshot-${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`;

    const newSnapshot: Snapshot = {
      ...snapshot,
      id,
      timestamp: now.toISOString(),
    };

    setSnapshots((currentSnapshots) => [newSnapshot, ...currentSnapshots]);
  }, [setSnapshots]);

  const deleteById = useCallback((id: string): void => {
    setSnapshots((currentSnapshots) => currentSnapshots.filter(snapshot => snapshot.id !== id));
  }, [setSnapshots]);

  const deleteAll = useCallback((): void => {
    setSnapshots([]);
  }, [setSnapshots]);

  const getByDate = useCallback((filter?: DateFilter): Record<string, Snapshot[]> => {
    const filteredSnapshots = filterItemsByDate<Snapshot>(snapshots, filter);
    return groupItemsByDate<Snapshot>(filteredSnapshots);
  }, [snapshots]);

  return {
    snapshots,
    getAll,
    getById,
    save,
    deleteById,
    deleteAll,
    getByDate
  };
};

// Legacy interface for backward compatibility
interface SnapshotStorage {
  getAll: () => Snapshot[];
  getById: (id: string) => Snapshot | null;
  save: (snapshot: Omit<Snapshot, "id" | "timestamp">) => void;
  deleteById: (id: string) => void;
  deleteAll: () => void;
  getByDate: (filter?: DateFilter) => Record<string, Snapshot[]>;
}

// For backward compatibility with non-React code
export const snapshotStorage: SnapshotStorage = {
  // This implementation forwards operations to localStorage directly
  // The atom will be updated via storage events
  getAll: () => {
    const snapshotsJson = localStorage.getItem(LOCAL_STORAGE_KEYS.SNAPSHOTS);
    return snapshotsJson ? JSON.parse(snapshotsJson) : [];
  },
  
  getById: (id: string) => {
    const snapshots = snapshotStorage.getAll();
    return snapshots.find(snapshot => snapshot.id === id) || null;
  },
  
  save: (snapshot: Omit<Snapshot, "id" | "timestamp">) => {
    const now = new Date();
    const id = `snapshot-${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`;

    const newSnapshot: Snapshot = {
      ...snapshot,
      id,
      timestamp: now.toISOString(),
    };

    // Update localStorage directly - the atom will be updated via storage events
    const snapshots = snapshotStorage.getAll();
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.SNAPSHOTS, 
      JSON.stringify([newSnapshot, ...snapshots])
    );
  },
  
  deleteById: (id: string) => {
    const snapshots = snapshotStorage.getAll();
    const updatedSnapshots = snapshots.filter(snapshot => snapshot.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SNAPSHOTS, JSON.stringify(updatedSnapshots));
  },
  
  deleteAll: () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SNAPSHOTS, JSON.stringify([]));
  },
  
  getByDate: (filter?: DateFilter) => {
    const snapshots = snapshotStorage.getAll();
    const filteredSnapshots = filterItemsByDate<Snapshot>(snapshots, filter);
    return groupItemsByDate<Snapshot>(filteredSnapshots);
  }
};
