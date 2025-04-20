import { useState, useEffect, useCallback } from "react";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { showToast } from "../components/toast";

// Define atoms for our state
const ephemeralModeAtom = atomWithStorage<boolean>(LOCAL_STORAGE_KEYS.EPHEMERAL_MODE, false);
const lastEphemeralClearAtom = atomWithStorage<string | null>(LOCAL_STORAGE_KEYS.LAST_EPHEMERAL_CLEAR, null);

/**
 * Custom hook to manage ephemeral mode
 * In ephemeral mode, the editor content is cleared at midnight every day
 */
export const useEphemeralMode = () => {
  const [ephemeralMode, setEphemeralMode] = useAtom(ephemeralModeAtom);
  const [lastClear, setLastClear] = useAtom(lastEphemeralClearAtom);
  const [initialized, setInitialized] = useState(false);

  // Function to get today's date string (YYYY-MM-DD)
  const getTodayString = useCallback(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(
      2,
      "0",
    )}`;
  }, []);

  // Function to clear editor content
  const clearEditorContent = useCallback(() => {
    const today = getTodayString();

    // Clear editor content
    localStorage.setItem(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "");

    // Update last clear date
    setLastClear(today);

    // Show notification
    showToast("Ephemeral mode: Editor content cleared for a new day", "info");

    // Dispatch a custom event to notify the editor about content reset
    window.dispatchEvent(
      new CustomEvent("ephe:content-restored", {
        detail: { content: "" },
      }),
    );
  }, [getTodayString, setLastClear]);

  // Function to check if we need to clear based on date change
  const checkForClear = useCallback(() => {
    const today = getTodayString();
    console.log(`[Ephemeral Mode] Checking clear status: lastClear=${lastClear}, today=${today}`);

    if (!lastClear || lastClear !== today) {
      clearEditorContent();
    }
  }, [getTodayString, lastClear, clearEditorContent]);

  // Check if we need to clear on startup
  useEffect(() => {
    if (!ephemeralMode || initialized) return;

    console.log("[Ephemeral Mode] Initializing and checking for clear on startup");
    checkForClear();
    setInitialized(true);
  }, [ephemeralMode, checkForClear, initialized]);

  // Set up scheduled check for midnight clearing
  useEffect(() => {
    if (!ephemeralMode) return;

    // Check time until midnight
    const calculateTimeUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      return midnight.getTime() - now.getTime();
    };

    // Set up timeout for midnight
    const setMidnightTimeout = () => {
      const timeUntilMidnight = calculateTimeUntilMidnight();

      return setTimeout(() => {
        console.log("[Ephemeral Mode] Midnight timeout triggered");
        checkForClear();
        // Set up the next day's timeout
        const nextDayTimeout = setMidnightTimeout();
        return () => clearTimeout(nextDayTimeout);
      }, timeUntilMidnight);
    };

    // Initial setup
    const timeoutId = setMidnightTimeout();

    // Also check every hour as a fallback (in case computer sleeps through midnight)
    const intervalId = setInterval(
      () => {
        checkForClear();
      },
      60 * 60 * 1000,
    );

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [ephemeralMode, checkForClear]);

  // Check for missed midnight when tab becomes visible again
  useEffect(() => {
    if (!ephemeralMode) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForClear();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [ephemeralMode, checkForClear]);

  // Toggle ephemeral mode
  const toggleEphemeralMode = useCallback(() => {
    const newMode = !ephemeralMode;
    setEphemeralMode(newMode);

    if (newMode) {
      // If turning on, check if we need to clear immediately
      const today = getTodayString();
      if (!lastClear || lastClear !== today) {
        clearEditorContent();
      }
      showToast("Ephemeral mode is ON: Content will be cleared daily at 00:00");
    } else {
      showToast("Ephemeral mode is OFF");
    }
  }, [ephemeralMode, setEphemeralMode, getTodayString, lastClear, clearEditorContent]);

  return {
    ephemeralMode,
    toggleEphemeralMode,
    lastClear,
  };
};
