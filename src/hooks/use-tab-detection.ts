"use client";

import { useState, useEffect } from "react";

// Constants for storage keys and settings
const STORAGE_KEY = "ephe-tab-data";
const CHECK_INTERVAL = 2000; // Check every 2 seconds
const MAX_STALE_TIME = 10000; // 10 seconds - consider tab closed after this time

// Return type for useTabDetection hook
export type TabDetectionResult = {
  shouldShowAlert: boolean;
  dismissAlert: () => void;
};

/**
 * Custom hook to detect if the application is already open in another tab
 */
export const useTabDetection = (): TabDetectionResult => {
  const [isOtherTabOpen, setIsOtherTabOpen] = useState<boolean>(false);
  const [alertDismissed, setAlertDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check browser compatibility
    if (typeof localStorage === "undefined") {
      return undefined;
    }

    // Generate a unique ID for this tab instance that persists through reloads
    const getTabId = (): string => {
      const KEY = "ephe-tab-id";
      let id = localStorage.getItem(KEY);
      if (!id) {
        id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(KEY, id);
      }
      return id;
    };

    const tabId = getTabId();
    
    // Check if alert was previously dismissed
    const wasDismissed = localStorage.getItem(`${STORAGE_KEY}-dismissed`) === "true";
    if (wasDismissed) {
      setAlertDismissed(true);
    }

    // Track tabs and their last activity timestamp
    const checkForOtherTabs = (): void => {
      try {
        // Get or initialize tab registry
        const storedData = localStorage.getItem(STORAGE_KEY);
        const tabsRegistry: Record<string, number> = storedData 
          ? JSON.parse(storedData) 
          : {};
        
        // Clean up stale tabs
        const now = Date.now();
        for (const id of Object.keys(tabsRegistry)) {
          if (now - tabsRegistry[id] > MAX_STALE_TIME) {
            delete tabsRegistry[id];
          }
        }
        
        // Update this tab's timestamp
        tabsRegistry[tabId] = now;
        
        // Save updated registry
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tabsRegistry));
        
        // Check if other tabs are open
        setIsOtherTabOpen(Object.keys(tabsRegistry).length > 1);
      } catch (error) {
        // If any error occurs, default to not showing alert
        setIsOtherTabOpen(false);
      }
    };
    
    // Handle tab cleanup
    const cleanupTab = () => {
      try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
          const tabsRegistry = JSON.parse(storedData);
          delete tabsRegistry[tabId];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tabsRegistry));
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    };
    
    // Initial check and setup interval
    checkForOtherTabs();
    window.addEventListener("beforeunload", cleanupTab);
    const intervalId = window.setInterval(checkForOtherTabs, CHECK_INTERVAL);
    
    // Cleanup on unmount
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("beforeunload", cleanupTab);
      cleanupTab();
    };
  }, []);
  
  // Function to dismiss the alert
  const dismissAlert = () => {
    setAlertDismissed(true);
    try {
      localStorage.setItem(`${STORAGE_KEY}-dismissed`, "true");
    } catch {
      // Ignore storage errors
    }
  };
  
  return {
    shouldShowAlert: isOtherTabOpen && !alertDismissed,
    dismissAlert
  };
} 