const DB_NAME = 'ephe-sync';
const DB_VERSION = 1;
const STORE_NAME = 'directory-handles';

export class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  async saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) throw new Error('Database not initialized');
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(handle, 'sync-directory');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) throw new Error('Database not initialized');
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('sync-directory');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  async clearDirectoryHandle(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) throw new Error('Database not initialized');
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('sync-directory');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}