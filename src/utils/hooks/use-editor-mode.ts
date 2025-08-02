import { LOCAL_STORAGE_KEYS } from "../constants";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";

export type EditorMode = "single" | "multi";

const editorModeAtom = atomWithStorage<EditorMode>(LOCAL_STORAGE_KEYS.EDITOR_MODE, "single");

export const useEditorMode = () => {
  const [editorMode, setEditorMode] = useAtom(editorModeAtom);

  const toggleEditorMode = () => {
    setEditorMode((prev) => (prev === "single" ? "multi" : "single"));
  };

  const setSingleMode = () => {
    setEditorMode("single");
  };

  const setMultiMode = () => {
    setEditorMode("multi");
  };

  return {
    editorMode,
    toggleEditorMode,
    setSingleMode,
    setMultiMode,
    isSingleMode: editorMode === "single",
    isMultiMode: editorMode === "multi",
  };
};
