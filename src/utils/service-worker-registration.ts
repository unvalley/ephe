import { LOCAL_STORAGE_KEYS } from "./constants";

// Define types for non-standard APIs
interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
}

interface ServiceWorkerRegistrationWithPeriodicSync extends ServiceWorkerRegistration {
  periodicSync?: PeriodicSyncManager;
}

/**
 * Registers the ephemeral service worker
 * This service worker will check and clear ephemeral content even when the browser is closed
 */
export function registerEphemeralServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        // Use our extended type for registration
        const registration = (await navigator.serviceWorker.register(
          "/ephemeral-service-worker.js",
        )) as ServiceWorkerRegistrationWithPeriodicSync;
        console.log("[Ephemeral Service Worker] Registered with scope:", registration.scope);

        // Set up message handling from service worker
        navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
        console.log("[Ephemeral Service Worker] Message handler registered");

        // Set up periodic sync if supported
        if (registration.periodicSync) {
          try {
            // Since PermissionName doesn't include 'periodic-background-sync', we have to use type assertion
            // in a production app we would define proper type extensions
            // biome-ignore lint/suspicious/noExplicitAny: Using type assertion for non-standard API
            const permissionStatus = await navigator.permissions.query({ name: "periodic-background-sync" } as any);

            if (permissionStatus.state === "granted") {
              await registration.periodicSync.register("ephemeral-midnight-check", {
                minInterval: 24 * 60 * 60 * 1000, // 24 hours
              });
              console.log("[Ephemeral Service Worker] Periodic sync registered");
            } else {
              console.log("[Ephemeral Service Worker] Periodic sync permission not granted:", permissionStatus.state);
            }
          } catch (err) {
            console.warn("[Ephemeral Service Worker] Periodic Sync could not be registered:", err);
          }
        } else {
          console.log("[Ephemeral Service Worker] Periodic Sync not supported in this browser");
        }
      } catch (err) {
        console.error("[Ephemeral Service Worker] Registration failed:", err);
      }
    });
  } else {
    console.log("[Ephemeral Service Worker] Service Workers not supported in this browser");
  }
}

/**
 * Handles messages from the service worker
 */
const handleServiceWorkerMessage = (event: MessageEvent) => {
  if (!event.data) return;

  console.log("[Ephemeral Service Worker] Received message from service worker:", event.data);

  // Service worker is requesting ephemeral mode status
  if (event.data.type === "CHECK_EPHEMERAL_MODE") {
    const ephemeralModeEnabled = localStorage.getItem(LOCAL_STORAGE_KEYS.EPHEMERAL_MODE) === "true";
    const lastClear = localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_EPHEMERAL_CLEAR);

    console.log(`[Ephemeral Service Worker] Checking status: enabled=${ephemeralModeEnabled}, lastClear=${lastClear}`);

    // Send status back to service worker
    navigator.serviceWorker.controller?.postMessage({
      type: "EPHEMERAL_MODE_STATUS",
      ephemeralModeEnabled,
      lastClear,
    });
  }

  // Service worker is requesting content clearing
  if (event.data.type === "CLEAR_EPHEMERAL_CONTENT") {
    console.log("[Ephemeral Service Worker] Clearing content as requested by Service Worker");

    // Clear editor content
    localStorage.setItem(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "");

    // Update last clear date
    localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_EPHEMERAL_CLEAR, event.data.today);

    // Notify any open tabs via custom event
    window.dispatchEvent(
      new CustomEvent("ephe:content-restored", {
        detail: { content: "" },
      }),
    );
  }
};
