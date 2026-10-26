import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { createCrossTabStorage } from "./cross-tab-storage";

export const editorContentAtom = atomWithStorage<string>(
  LOCAL_STORAGE_KEYS.EDITOR_CONTENT,
  "",
  createCrossTabStorage<string>(),
);
