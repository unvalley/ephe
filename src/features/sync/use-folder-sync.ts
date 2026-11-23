import type { EditorView } from "@codemirror/view";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { folderSyncStateAtom, startFolderSync, toggleFolderSync } from "./folder-sync";

export const useFolderSync = () => {
  const folderSync = useAtomValue(folderSyncStateAtom);

  return {
    folderSync,
    isFolderSyncSupported: folderSync.status !== "unsupported",
    toggleFolderSync: () => toggleFolderSync(folderSync),
  };
};

/** Keeps the documents and the linked folder in sync for as long as the caller is mounted. */
export const useFolderSyncRunner = (getEditorView: () => EditorView | null) => {
  const getEditorViewRef = useRef(getEditorView);

  useEffect(() => {
    getEditorViewRef.current = getEditorView;
  }, [getEditorView]);

  useEffect(() => startFolderSync(() => getEditorViewRef.current()), []);
};
