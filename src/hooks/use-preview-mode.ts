import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../utils/constants";

export const previewModeAtom = atomWithStorage<boolean>(LOCAL_STORAGE_KEYS.PREVIEW_MODE, false);

export const usePreviewMode = () => {
  const [previewMode, setPreviewMode] = useAtom(previewModeAtom);
  const togglePreviewMode = () => {
    setPreviewMode((prev) => !prev);
  };
  return { previewMode, togglePreviewMode };
};
