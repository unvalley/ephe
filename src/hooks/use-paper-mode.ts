import { useSyncExternalStore } from "react";

// Define paper mode types
export type PaperMode = "none" | "graph" | "dots"

// Local storage key
const PAPER_MODE_KEY = "ephe-paper-mode";

// CSS class names for each mode
export const PAPER_MODE_CLASSES: Record<PaperMode, string> = {
  none: "",
  graph: "bg-graph-paper",
  dots: "bg-dots-paper",
};

/**
 * Paper mode state management
 */
const createPaperModeStore = () => {
  // List of subscribers
  const subscribers = new Set<() => void>();

  // Get current mode
  const getCurrentMode = (): PaperMode => {
    if (typeof window === "undefined") return "none";
    
    const saved = localStorage.getItem(PAPER_MODE_KEY);
    return (saved as PaperMode) || "none";
  };

  // Current mode
  let currentMode = getCurrentMode();

  // Set mode and notify subscribers
  const setMode = (mode: PaperMode) => {
    if (currentMode === mode) return;
    
    currentMode = mode;
    localStorage.setItem(PAPER_MODE_KEY, mode);
    
    // Notify all subscribers
    for (const callback of subscribers) {
      callback();
    }
  };

  // Cycle to the next mode
  const cycleMode = () => {
    const modes: PaperMode[] = ["none", "graph", "dots"];
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
    return modes[nextIndex];
  };

  // Toggle specific mode
  const toggleMode = (mode: PaperMode) => {
    setMode(currentMode === mode ? "none" : mode);
    return currentMode;
  };

  // Subscribe function for the store
  const subscribe = (callback: () => void) => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  };

  // Get current state function
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

// Create store as singleton
const paperModeStore = createPaperModeStore();

/**
 * Custom hook to manage paper mode
 * @returns Paper mode state and operations
 */
export const usePaperMode = () => {
  // Subscribe to the store and detect changes
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
  };
}; 