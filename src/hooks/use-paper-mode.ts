import { useSyncExternalStore } from "react";
import { LOCAL_STORAGE_KEYS } from "../utils/constants";

export type PaperMode = "normal" | "graph" | "dots";

export const PAPER_MODE_CLASSES: Record<PaperMode, string> = {
  normal: "",
  graph: "bg-graph-paper",
  dots: "bg-dots-paper",
};

const createPaperModeStore = () => {
  const subscribers = new Set<() => void>();

  const getCurrentMode = (): PaperMode => {
    if (typeof window === "undefined") return "normal";

    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.PAPER_MODE);
    return (saved as PaperMode) || "normal";
  };

  let currentMode = getCurrentMode();

  const setMode = (mode: PaperMode) => {
    if (currentMode === mode) return;

    currentMode = mode;
    localStorage.setItem(LOCAL_STORAGE_KEYS.PAPER_MODE, mode);

    // Notify all subscribers
    for (const callback of subscribers) {
      callback();
    }
  };

  const cycleMode = () => {
    const modes: PaperMode[] = ["normal", "graph", "dots"];
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
    return modes[nextIndex];
  };

  const toggleMode = (mode: PaperMode) => {
    setMode(currentMode === mode ? "normal" : mode);
    return currentMode;
  };

  const subscribe = (callback: () => void) => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  };

  const getSnapshot = () => {
    return currentMode;
  };

  return {
    subscribe,
    getSnapshot,
    setMode,
    cycleMode,
    toggleMode,
  };
};

const paperModeStore = createPaperModeStore();

/**
 * Custom hook to manage paper mode
 * @returns Paper mode state and operations
 */
export const usePaperMode = () => {
  const mode = useSyncExternalStore(paperModeStore.subscribe, paperModeStore.getSnapshot);

  return {
    paperMode: mode,
    paperModeClass: PAPER_MODE_CLASSES[mode],
    setMode: paperModeStore.setMode,
    cycleMode: paperModeStore.cycleMode,
    toggleNormalMode: () => paperModeStore.toggleMode("normal"),
    toggleGraphMode: () => paperModeStore.toggleMode("graph"),
    toggleDotsMode: () => paperModeStore.toggleMode("dots"),
  };
};
