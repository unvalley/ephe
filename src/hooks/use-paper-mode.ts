import { useSyncExternalStore } from "react";

export type PaperMode = "none" | "graph" | "dots" | "texture";

const PAPER_MODE_KEY = "ephe-paper-mode";

export const PAPER_MODE_CLASSES: Record<PaperMode, string> = {
  none: "",
  graph: "bg-graph-paper",
  dots: "bg-dots-paper",
  texture: "bg-paper-texture",
};

const createPaperModeStore = () => {
  const subscribers = new Set<() => void>();

  const getCurrentMode = (): PaperMode => {
    if (typeof window === "undefined") return "none";

    const saved = localStorage.getItem(PAPER_MODE_KEY);
    return (saved as PaperMode) || "none";
  };

  let currentMode = getCurrentMode();

  const setMode = (mode: PaperMode) => {
    if (currentMode === mode) return;

    currentMode = mode;
    localStorage.setItem(PAPER_MODE_KEY, mode);

    // Notify all subscribers
    for (const callback of subscribers) {
      callback();
    }
  };

  const cycleMode = () => {
    const modes: PaperMode[] = ["none", "graph", "dots", "texture"];
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
    return modes[nextIndex];
  };

  const toggleMode = (mode: PaperMode) => {
    setMode(currentMode === mode ? "none" : mode);
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
  const mode = useSyncExternalStore(
    paperModeStore.subscribe,
    paperModeStore.getSnapshot
  );

  return {
    paperMode: mode,
    paperModeClass: PAPER_MODE_CLASSES[mode],
    setMode: paperModeStore.setMode,
    cycleMode: paperModeStore.cycleMode,
    toggleGraphMode: () => paperModeStore.toggleMode("graph"),
    toggleDotsMode: () => paperModeStore.toggleMode("dots"),
    toggleTextureMode: () => paperModeStore.toggleMode("texture"),
  };
};
