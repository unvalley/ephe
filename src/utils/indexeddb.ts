import { EDITOR_CONTENT_KEY } from "./constants";

const DB_NAME = "ephe" as const;
const STORE_NAME = "editor-content" as const;
const DB_VERSION = 1;

type StoreName = typeof STORE_NAME;


const openDB = async (): Promise<IDBDatabase> => {
    return await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
};

const getStore = (
  db: IDBDatabase,
  storeName: StoreName,
  mode: IDBTransactionMode
): IDBObjectStore => {
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
};

export const saveContent = async (content: string): Promise<void> => {
    const db = await openDB();
    const store = getStore(db, STORE_NAME, "readwrite");

    await new Promise<void>((resolve, reject) => {
      const request = store.put(content, EDITOR_CONTENT_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
};

export const loadContent = async (): Promise<string | null> => {
    const db = await openDB();
    const store = getStore(db, STORE_NAME, "readonly");

    return await new Promise<string | null>((resolve, reject) => {
      const request = store.get(EDITOR_CONTENT_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
}; 