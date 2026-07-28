import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { useAtom } from "jotai";

export type FocusMode = "off" | "on";

export const focusModeAtom = atomWithStorage<FocusMode>(LOCAL_STORAGE_KEYS.FOCUS_MODE, "off");

export const useFocusMode = () => {
  const [focusMode, setFocusMode] = useAtom(focusModeAtom);

  const toggleFocusMode = () => {
    const next: FocusMode = focusMode === "on" ? "off" : "on";
    setFocusMode(next);
    return next;
  };

  return {
    focusMode,
    isFocusMode: focusMode === "on",
    setFocusMode,
    toggleFocusMode,
  };
};
