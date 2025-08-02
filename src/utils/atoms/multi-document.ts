import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../constants";

// Create cross-tab storage adapter for multi-document support
const createCrossTabStorage = <T>() => {
  return {
    getItem: (key: string, initialValue: T): T => {
      if (typeof window === "undefined") {
        return initialValue;
      }
      const item = localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      try {
        return JSON.parse(item);
      } catch {
        return initialValue;
      }
    },
    setItem: (key: string, value: T): void => {
      if (typeof window === "undefined") {
        return;
      }
      localStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: (key: string): void => {
      if (typeof window === "undefined") {
        return;
      }
      localStorage.removeItem(key);
    },
    subscribe: (key: string, callback: (value: T) => void, initialValue: T): (() => void) => {
      if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
        return () => {};
      }
      const handler = (e: StorageEvent) => {
        if (e.storageArea === localStorage && e.key === key) {
          try {
            const newValue = e.newValue ? JSON.parse(e.newValue) : initialValue;
            callback(newValue);
          } catch {
            callback(initialValue);
          }
        }
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
};

// Document interface for multi-document support
export type Document = {
  id: string;
  content: string;
  lastModified: number;
};

// Default documents initialization
export const DEFAULT_DOCUMENTS: Document[] = Array.from({ length: 5 }, (_, i) => ({
  id: `doc-${i}`,
  content: "",
  lastModified: Date.now(),
}));

export const documentsAtom = atomWithStorage<Document[]>(
  LOCAL_STORAGE_KEYS.DOCUMENTS,
  DEFAULT_DOCUMENTS,
  createCrossTabStorage<Document[]>(),
);

export const activeDocumentIndexAtom = atomWithStorage<number>(LOCAL_STORAGE_KEYS.ACTIVE_DOCUMENT_INDEX, 0);
