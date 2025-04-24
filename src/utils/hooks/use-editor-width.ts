import { LOCAL_STORAGE_KEYS } from "../constants";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { ValueOf } from "../types";

const EDITOR_WITH = {
  NORMAL: "normal",
  WIDE: "wide",
} as const;

export type EditorWidth = ValueOf<typeof EDITOR_WITH>;

// Create a storage implementation with proper subscribe method for cross-tab sync
const editorWidthJSONStorage = createJSONStorage<EditorWidth>(() => localStorage, {
  // Add optional reviver/replacer if needed
});

const editorWidthAtom = atomWithStorage<EditorWidth>(
  LOCAL_STORAGE_KEYS.EDITOR_WIDTH, 
  "normal",
  editorWidthJSONStorage,
  { getOnInit: true }
);

export const useEditorWidth = () => {
  const [editorWidth, setEditorWidth] = useAtom(editorWidthAtom);

  const toggleEditorWidth = () => {
    setEditorWidth((prev) => (prev === EDITOR_WITH.NORMAL ? EDITOR_WITH.WIDE : EDITOR_WITH.NORMAL));
  };

  const setNormalWidth = () => {
    setEditorWidth(EDITOR_WITH.NORMAL);
  };

  const setWideWidth = () => {
    setEditorWidth(EDITOR_WITH.WIDE);
  };
  return {
    editorWidth,
    toggleEditorWidth,
    isWideMode: editorWidth === EDITOR_WITH.WIDE,
    setNormalWidth,
    setWideWidth,
  };
};
