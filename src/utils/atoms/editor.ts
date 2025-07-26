import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../constants";

const storage = createJSONStorage<string>(() => localStorage);

const crossTabStorage = {
  ...storage,
  subscribe: (key: string, callback: (value: string) => void, initialValue: string): (() => void) => {
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

export const editorContentAtom = atomWithStorage<string>(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "", crossTabStorage);

// Multiple documents support
export interface Document {
  id: string;
  content: string;
  lastModified: number;
}

export const DEFAULT_DOCUMENTS: Document[] = Array.from({ length: 5 }, (_, i) => ({
  id: `doc-${i}`,
  content: "",
  lastModified: Date.now(),
}));

export const documentsAtom = atomWithStorage<Document[]>(
  LOCAL_STORAGE_KEYS.DOCUMENTS,
  DEFAULT_DOCUMENTS,
  crossTabStorage,
);

export const activeDocumentIndexAtom = atomWithStorage<number>(
  LOCAL_STORAGE_KEYS.ACTIVE_DOCUMENT_INDEX,
  0,
  crossTabStorage,
);
