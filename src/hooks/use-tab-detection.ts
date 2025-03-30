"use client";

import { useState, useEffect } from "react";
import type { ValueOf } from "src/utils/types";

// Constants for storage keys and settings
const STORAGE = {
  LOCK_KEY: "ephe-tab-lock",
  CHANNEL_NAME: "ephe-tab-channel",
  CHECK_INTERVAL: 1000, // Check every second
  MAX_STALE_TIME: 3000, // 3 seconds - consider tab closed after this time
};

// Message types for broadcast channel
const MessageType = {
  PING: "ping",
  PONG: "pong",
  CONTENT_UPDATE: "content_update",
} as const;

type TabRegistry = {
  [tabId: string]: number;
}

type SyncMessage = {
  type: ValueOf<typeof MessageType>;
  id: string;
  timestamp: number;
  content?: string;
}

export type WindowWithSync = Window & {
  epheSyncContent?: (content: string) => void;
}

export type ContentSyncEvent = {
  content: string;
  sourceId: string;
}

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
 * This version still detects other tabs but enables working together
 * @returns {boolean} True if another instance is already running
 */
export function useTabDetection(): boolean {
  const [isOtherTabOpen, setIsOtherTabOpen] = useState<boolean>(false);

  useEffect(() => {
    // Skip detection if not supported in this browser
    if (!isSupported()) {
      return undefined;
    }
    
    const tabId = Math.random().toString(36).substring(2, 15);
    let broadcastChannel: BroadcastChannel | null = null;
    
    // Initialize broadcast channel for cross-tab communication if supported
    if (typeof BroadcastChannel !== "undefined") {
      try {
        broadcastChannel = new BroadcastChannel(STORAGE.CHANNEL_NAME);
        
        // Listen for messages from other tabs
        broadcastChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
          const { type, id, content } = event.data;
          
          // Handle different message types
          switch (type) {
            case MessageType.PING:
              // Respond to pings with current tab's ID
              broadcastChannel?.postMessage({
                type: MessageType.PONG,
                id: tabId,
                timestamp: Date.now()
              });
              break;
              
            case MessageType.PONG:
              // If another tab responds to our ping, mark as other tab open
              if (id !== tabId) {
                setIsOtherTabOpen(true);
              }
              break;
              
            case MessageType.CONTENT_UPDATE:
              // Dispatch content update events to the application
              if (content) {
                window.dispatchEvent(
                  new CustomEvent<ContentSyncEvent>("ephe-remote-content-update", {
                    detail: {
                      content,
                      sourceId: id
                    }
                  })
                );
              }
              break;
          }
        };
      } catch (e) {
        console.error("Error creating BroadcastChannel:", e);
      }
    }
    
    // Register all open tabs
    const registerTab = (): void => {
      try {
        // Get current tabs registry or initialize empty one
        const tabsRegistryStr = sessionStorage.getItem(STORAGE.LOCK_KEY);
        let tabsRegistry: TabRegistry = {};
        
        if (tabsRegistryStr) {
          tabsRegistry = JSON.parse(tabsRegistryStr);
        }
        
        // Add this tab with current timestamp
        tabsRegistry[tabId] = Date.now();
        
        // Clean up stale tabs
        const now = Date.now();
        for (const id of Object.keys(tabsRegistry)) {
          if (now - tabsRegistry[id] > STORAGE.MAX_STALE_TIME) {
            delete tabsRegistry[id];
          }
        }
        
        // Save registry back
        sessionStorage.setItem(STORAGE.LOCK_KEY, JSON.stringify(tabsRegistry));
        
        // If more than one active tab, set other tab open flag
        setIsOtherTabOpen(Object.keys(tabsRegistry).length > 1);
      } catch (error) {
        console.error("Error updating tabs registry:", error);
      }
    };
    
    // Function to ping other tabs to check if they're open
    const pingOtherTabs = () => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: MessageType.PING,
          id: tabId,
          timestamp: Date.now()
        });
      }
    };
    
    // Method to sync content with other tabs (exposed via window object)
    const syncContent = (content: string) => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: MessageType.CONTENT_UPDATE,
          id: tabId,
          content,
          timestamp: Date.now()
        });
      }
    };
    
    // Expose the sync method to window for external usage
    (window as WindowWithSync).epheSyncContent = syncContent;
    
    // Initial tab registration
    registerTab();
    
    // Initial ping to find other tabs
    pingOtherTabs();
    
    // Set up interval to check regularly
    const intervalId = window.setInterval(() => {
      registerTab();
      pingOtherTabs();
    }, STORAGE.CHECK_INTERVAL);
    
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
      
      // Close the broadcast channel
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      
      // Remove the global sync method
      if ((window as WindowWithSync).epheSyncContent) {
        (window as WindowWithSync).epheSyncContent = undefined;
      }
    };
  }, []);
  
  return isOtherTabOpen;
} 