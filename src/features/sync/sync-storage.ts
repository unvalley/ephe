import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import type { StorageProvider } from "../../utils/storage";
import type { BaseStore } from "./sync-engine";

// A directory handle is only storable through structured clone, so it lives in
// IndexedDB instead of localStorage like the rest of the app's state.
const DB_NAME = "ephe:folder-sync";
const STORE_NAME = "handles";
const DIRECTORY_KEY = "directory";

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withHandleStore = async <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = run(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

export const loadSyncDirectory = async (): Promise<FileSystemDirectoryHandle | null> =>
  (await withHandleStore<FileSystemDirectoryHandle | undefined>("readonly", (store) => store.get(DIRECTORY_KEY))) ??
  null;

export const saveSyncDirectory = async (directory: FileSystemDirectoryHandle): Promise<void> => {
  await withHandleStore("readwrite", (store) => store.put(directory, DIRECTORY_KEY));
};

export const clearSyncDirectory = async (): Promise<void> => {
  await withHandleStore("readwrite", (store) => store.delete(DIRECTORY_KEY));
};

type ClearableStorage = StorageProvider & { removeItem: (key: string) => void };

const browserStorage: ClearableStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

const parseBases = (raw: string | null): Record<string, string> => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
};

/**
 * Remembers, per file, the content this browser and the folder last agreed on.
 * It is read back from storage on every call so that tabs of the same browser
 * share one view of it. Losing it is safe: differing content then counts as a
 * conflict and both versions are kept.
 */
export const createBaseStore = (storage: ClearableStorage = browserStorage): BaseStore & { clear: () => void } => {
  let cachedRaw: string | null = null;
  let cached: Record<string, string> = {};

  const load = (): Record<string, string> => {
    const raw = storage.getItem(LOCAL_STORAGE_KEYS.SYNC_BASES);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = parseBases(raw);
    }
    return cached;
  };

  return {
    get: (fileName) => load()[fileName] ?? null,
    set: (fileName, content) => {
      storage.setItem(LOCAL_STORAGE_KEYS.SYNC_BASES, JSON.stringify({ ...load(), [fileName]: content }));
    },
    clear: () => storage.removeItem(LOCAL_STORAGE_KEYS.SYNC_BASES),
  };
};
