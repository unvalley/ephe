import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { createCrossTabStorage } from "./cross-tab-storage";

// Document interface for multi-document support
export type Document = {
  id: string;
  content: string;
  lastModified: number;
};

// Default documents initialization
const DEFAULT_DOCUMENTS: Document[] = Array.from({ length: 5 }, (_, i) => ({
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
