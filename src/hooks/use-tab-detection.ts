"use client";

import { useState, useEffect } from "react";

// Constants for storage keys and settings
const STORAGE = {
  LOCK_KEY: "ephe-tab-lock",
  ALERT_DISMISSED_KEY: "ephe-alert-dismissed",
  CHECK_INTERVAL: 5000, // Check every 5 seconds
  MAX_STALE_TIME: 5000, // 5 seconds - consider tab closed after this time
};

// Return type for useTabDetection hook
export type TabDetectionResult = {
  shouldShowAlert: boolean;
  dismissAlert: () => void;
};

/**
 * Check if the browser supports sessionStorage and required features
 */
const isSupported = (): boolean => {
  try {
    // Check sessionStorage support
    if (typeof sessionStorage === "undefined") {
      return false;
    }
    
    // Test if we can actually use it (might be disabled in some contexts)
    const testKey = `__test_${Date.now()}`;
    sessionStorage.setItem(testKey, "test");
    sessionStorage.removeItem(testKey);
    
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Custom hook to detect if the application is already open in another tab
 * and manage the alert state
 * @returns {TabDetectionResult} Object containing state and functions for tab detection
 */
export function useTabDetection(): TabDetectionResult {
  const [isOtherTabOpen, setIsOtherTabOpen] = useState<boolean>(false);
  const [alertDismissed, setAlertDismissed] = useState<boolean>(false);
  
  // Get alert visibility based on other tabs and dismissal state
  const shouldShowAlert = isOtherTabOpen && !alertDismissed;

  useEffect(() => {
    // Skip detection if not supported in this browser
    if (!isSupported()) {
      return undefined;
    }
    
    const tabId = Math.random().toString(36).substring(2, 15);
    
    // Try to load alert dismissed state from sessionStorage
    try {
      const dismissedState = sessionStorage.getItem(STORAGE.ALERT_DISMISSED_KEY);
      if (dismissedState === "true") {
        setAlertDismissed(true);
      }
    } catch (e) {
      console.error("Error loading alert dismissed state:", e);
    }
    
    // Simple function to register this tab and check for others
    const checkForOtherTabs = (): void => {
      try {
        // Get current tabs registry or initialize empty one
        const tabsRegistryStr = sessionStorage.getItem(STORAGE.LOCK_KEY);
        let tabsRegistry: { [key: string]: number } = {};
        
        if (tabsRegistryStr) {
          try {
            tabsRegistry = JSON.parse(tabsRegistryStr);
          } catch (e) {
            // If corrupt, start with a clean registry
            console.error("Error parsing tab registry, resetting:", e);
            tabsRegistry = {};
          }
        }
        
        // Clean up stale tabs
        const now = Date.now();
        for (const id of Object.keys(tabsRegistry)) {
          if (now - tabsRegistry[id] > STORAGE.MAX_STALE_TIME) {
            delete tabsRegistry[id];
          }
        }
        
        // Add this tab with current timestamp
        tabsRegistry[tabId] = now;
        
        // Save registry back
        sessionStorage.setItem(STORAGE.LOCK_KEY, JSON.stringify(tabsRegistry));
        
        // If more than one active tab, set other tab open flag
        setIsOtherTabOpen(Object.keys(tabsRegistry).length > 1);
      } catch (error) {
        console.error("Error checking for other tabs:", error);
      }
    };
    
    // Initial check
    checkForOtherTabs();
    
    // Set up interval to check regularly
    const intervalId = window.setInterval(checkForOtherTabs, STORAGE.CHECK_INTERVAL);
    
    // Clean up on unmount
    return () => {
      window.clearInterval(intervalId);
      
      // Remove this tab from the registry
      try {
        const tabsRegistryStr = sessionStorage.getItem(STORAGE.LOCK_KEY);
        if (tabsRegistryStr) {
          const tabsRegistry = JSON.parse(tabsRegistryStr);
          delete tabsRegistry[tabId];
          sessionStorage.setItem(STORAGE.LOCK_KEY, JSON.stringify(tabsRegistry));
        }
      } catch (error) {
        console.error("Error removing tab from registry:", error);
      }
    };
  }, []);
  
  // Function to dismiss the alert
  const dismissAlert = () => {
    setAlertDismissed(true);
    try {
      sessionStorage.setItem(STORAGE.ALERT_DISMISSED_KEY, "true");
    } catch (e) {
      console.error("Error saving alert dismissed state:", e);
    }
  };
  
  return {
    shouldShowAlert,
    dismissAlert
  };
} 