// Ephemeral Service Worker
// Performs content clearing for ephemeral mode even when the browser is closed

const LOCAL_STORAGE_KEYS = {
  EDITOR_CONTENT: "ephe:editor-content",
  EPHEMERAL_MODE: "ephe:ephemeral-mode",
  LAST_EPHEMERAL_CLEAR: "ephe:last-ephemeral-clear",
};

// Install event - cache necessary files
self.addEventListener("install", (event) => {
  console.log("[Ephemeral Service Worker] Installing");
  self.skipWaiting();
});

// Activate event - claim clients
self.addEventListener("activate", (event) => {
  console.log("[Ephemeral Service Worker] Activating");
  event.waitUntil(clients.claim());
});

// Function to get today's date string (YYYY-MM-DD)
function getTodayString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(
    2,
    "0",
  )}`;
}

// Function to handle periodic checks
async function checkForMidnightClear() {
  console.log("[Ephemeral Service Worker] Checking for midnight clear");
  try {
    // Use clients API to communicate with page script
    const allClients = await clients.matchAll();

    // Get data from all clients (will use the first one to read from localStorage)
    if (allClients.length > 0) {
      console.log("[Ephemeral Service Worker] Found clients, requesting ephemeral mode status");
      // Send message to client to check localStorage
      allClients[0].postMessage({
        type: "CHECK_EPHEMERAL_MODE",
      });
    } else {
      console.log("[Ephemeral Service Worker] No clients found");
    }
  } catch (error) {
    console.error("[Ephemeral Service Worker] Error:", error);
  }
}

// Listen for messages from clients
self.addEventListener("message", (event) => {
  console.log("[Ephemeral Service Worker] Received message from client:", event.data);

  // Client sent information about ephemeral mode
  if (event.data && event.data.type === "EPHEMERAL_MODE_STATUS") {
    const { ephemeralModeEnabled, lastClear } = event.data;

    console.log(`[Ephemeral Service Worker] Status received: enabled=${ephemeralModeEnabled}, lastClear=${lastClear}`);

    if (ephemeralModeEnabled) {
      const today = getTodayString();

      console.log(`[Ephemeral Service Worker] Comparing dates: today=${today}, lastClear=${lastClear}`);

      // If no last clear date or it's different from today, request clearing
      if (!lastClear || lastClear !== today) {
        console.log("[Ephemeral Service Worker] Need to clear, sending request to client");
        // Send message to client to clear content
        event.source.postMessage({
          type: "CLEAR_EPHEMERAL_CONTENT",
          today: today,
        });
      } else {
        console.log("[Ephemeral Service Worker] No need to clear content");
      }
    } else {
      console.log("[Ephemeral Service Worker] Ephemeral mode not enabled");
    }
  }
});

// Set up periodic sync (if supported)
self.addEventListener("periodicsync", (event) => {
  console.log("[Ephemeral Service Worker] Periodic sync triggered:", event.tag);
  if (event.tag === "ephemeral-midnight-check") {
    event.waitUntil(checkForMidnightClear());
  }
});

// Fallback: Use push event for periodic checks
self.addEventListener("push", (event) => {
  console.log("[Ephemeral Service Worker] Push event received");
  if (event.data && event.data.text() === "ephemeral-check") {
    event.waitUntil(checkForMidnightClear());
  }
});
