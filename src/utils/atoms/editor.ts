import { atom } from "jotai";
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

// Ephemeral editor content used for stats (word/char count).
// Do not persist to storage to avoid clobbering multi-document data.
export const editorStatsContentAtom = atom<string>("");
