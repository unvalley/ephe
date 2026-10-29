import type { EditorView } from "@codemirror/view";
import { atom, getDefaultStore } from "jotai";
import { editorContentAtom } from "../../utils/atoms/editor";
import { activeDocumentIndexAtom, documentsAtom } from "../../utils/atoms/multi-document";
import { dismissToast, showToast } from "../../utils/components/toast";
import { editorModeAtom } from "../../utils/hooks/use-editor-mode";
import { type BaseStore, type SyncDocument, type SyncOutcome, syncDocuments } from "./sync-engine";
import {
  createSyncFolder,
  isFolderSyncSupported,
  pickSyncDirectory,
  queryFolderPermission,
  requestFolderPermission,
} from "./sync-folder";
import { multiFileName, SINGLE_FILE_NAME } from "./sync-plan";
import { clearSyncDirectory, createBaseStore, loadSyncDirectory, saveSyncDirectory } from "./sync-storage";

type FolderSyncState =
  | { status: "unsupported" | "off" }
  /** A folder is linked, but the browser wants the user to allow access again. */
  | { status: "needs-permission"; folderName: string }
  | { status: "on"; folderName: string; error?: string };

export const folderSyncStateAtom = atom<FolderSyncState>({ status: "off" });

const POLL_INTERVAL_MS = 2000;
const LOCK_NAME = "ephe:folder-sync";
const CHANNEL_NAME = "ephe:folder-sync";
const RECONNECT_TOAST_ID = "ephe:folder-sync-reconnect";

type Link = { directory: FileSystemDirectoryHandle };

const store = getDefaultStore();
const bases = createBaseStore();

// Replaced whenever the linked folder changes, so a pass that is still in
// flight can tell that what it learned no longer applies.
let link: Link | null = null;
let getEditorView: () => EditorView | null = () => null;
let generation = 0;
let running = false;
let queued = false;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let channel: BroadcastChannel | null = null;

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : "unknown");

const setState = (state: FolderSyncState) => {
  store.set(folderSyncStateAtom, state);
};

// While the editor shows something its atom has not caught up with (keystrokes
// inside the save debounce), replacing the atom would drop that text. Replacing
// the document under an IME composition would break the composition.
const isEditorSettled = (content: string): boolean => {
  const view = getEditorView();
  return !view || (!view.composing && view.state.doc.toString() === content);
};

const syncTargets = (): SyncDocument[] => {
  const single: SyncDocument = {
    fileName: SINGLE_FILE_NAME,
    getLocal: () => store.get(editorContentAtom),
    setLocal: (content) => store.set(editorContentAtom, content),
    isSettled: () => store.get(editorModeAtom) !== "single" || isEditorSettled(store.get(editorContentAtom)),
  };

  const multi = store.get(documentsAtom).map((_, index): SyncDocument => {
    const getLocal = () => store.get(documentsAtom)[index]?.content ?? "";
    return {
      fileName: multiFileName(index),
      getLocal,
      setLocal: (content) =>
        store.set(documentsAtom, (documents) =>
          documents.map((document, i) => (i === index ? { ...document, content, lastModified: Date.now() } : document)),
        ),
      isSettled: () =>
        store.get(editorModeAtom) !== "multi" ||
        store.get(activeDocumentIndexAtom) !== index ||
        isEditorSettled(getLocal()),
    };
  });

  return [single, ...multi];
};

const pause = (current: Link) => {
  setState({ status: "needs-permission", folderName: current.directory.name });
  showToast("Folder sync is paused", "default", {
    id: RECONNECT_TOAST_ID,
    description: `Allow access to "${current.directory.name}" to resume.`,
    duration: Number.POSITIVE_INFINITY,
    action: { label: "Reconnect", onClick: () => void reconnectFolderSync() },
  });
};

const resume = (current: Link) => {
  setState({ status: "on", folderName: current.directory.name });
  dismissToast(RECONNECT_TOAST_ID);
  requestSync();
};

const report = async (outcomes: SyncOutcome[], current: Link) => {
  let failure: unknown;
  for (const outcome of outcomes) {
    if (outcome.type === "conflict") {
      showToast(`Sync conflict in ${outcome.fileName}`, "info", {
        description: `This browser's version was kept as "${outcome.conflictCopy}".`,
        duration: 10_000,
      });
    }
    if (outcome.type === "error") failure ??= outcome.error;
  }

  // The browser can withdraw access at any time; that is a pause, not a failure.
  const permission = failure === undefined ? "granted" : await queryFolderPermission(current.directory);
  const state = store.get(folderSyncStateAtom);
  if (current !== link || state.status !== "on") return;

  if (failure === undefined) {
    if (state.error !== undefined) setState({ status: "on", folderName: state.folderName });
    return;
  }
  if (permission !== "granted") {
    pause(current);
    return;
  }
  const message = errorMessage(failure);
  // The same failure repeats on every pass; say it once.
  if (state.error === message) return;
  setState({ ...state, error: message });
  showToast(`Folder sync failed: ${message}`, "error");
};

const pass = async () => {
  const current = link;
  if (!current || store.get(folderSyncStateAtom).status !== "on") return;

  const isCurrent = () => current === link;
  const guardedBases: BaseStore = {
    get: bases.get,
    set: (fileName, content) => {
      if (isCurrent()) bases.set(fileName, content);
    },
  };
  const targets = syncTargets().map(
    (target): SyncDocument => ({
      ...target,
      setLocal: (content) => {
        if (isCurrent()) target.setLocal(content);
      },
    }),
  );

  const outcomes = await syncDocuments(targets, createSyncFolder(current.directory), guardedBases);
  await report(outcomes, current);
};

// Tabs of one browser share the documents and the bases, so only one of them
// talks to the folder at a time. A tab that loses the race just skips the pass.
const withBrowserLock = async (task: () => Promise<void>): Promise<void> => {
  if (!navigator.locks) return task();
  await navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
    if (lock) await task();
  });
};

const requestSync = () => {
  if (store.get(folderSyncStateAtom).status !== "on") return;
  if (running) {
    queued = true;
    return;
  }
  running = true;
  void (async () => {
    try {
      do {
        queued = false;
        await withBrowserLock(pass);
      } while (queued);
    } catch (error) {
      console.error("Folder sync failed:", error);
    } finally {
      running = false;
    }
  })();
};

const restore = async (current: number) => {
  try {
    const saved = await loadSyncDirectory();
    if (current !== generation) return;
    if (!saved) {
      link = null;
      setState({ status: "off" });
      dismissToast(RECONNECT_TOAST_ID);
      return;
    }

    const isSameFolder = link !== null && (await link.directory.isSameEntry(saved));
    if (current !== generation) return;
    const restored = isSameFolder && link ? link : { directory: saved };
    link = restored;

    const permission = await queryFolderPermission(restored.directory);
    if (current !== generation || restored !== link) return;
    if (permission === "granted") {
      resume(restored);
    } else {
      pause(restored);
    }
  } catch (error) {
    console.error("Could not restore folder sync:", error);
  }
};

const updatePolling = () => {
  const shouldPoll = store.get(folderSyncStateAtom).status === "on";
  if (shouldPoll && pollTimer === undefined) {
    pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") requestSync();
    }, POLL_INTERVAL_MS);
  } else if (!shouldPoll && pollTimer !== undefined) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
};

/**
 * Starts mirroring the documents to the linked folder, if there is one.
 * Returns the function that stops it.
 */
export const startFolderSync = (viewGetter: () => EditorView | null): (() => void) => {
  if (!isFolderSyncSupported()) {
    setState({ status: "unsupported" });
    return () => {};
  }

  const current = ++generation;
  getEditorView = viewGetter;

  // Subscribing also mounts the storage atoms. Unmounted, they report their
  // defaults instead of what is stored, which would read as "all documents empty".
  const unsubscribes = [
    store.sub(editorContentAtom, requestSync),
    store.sub(documentsAtom, requestSync),
    store.sub(editorModeAtom, () => {}),
    store.sub(activeDocumentIndexAtom, () => {}),
    store.sub(folderSyncStateAtom, updatePolling),
  ];

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") requestSync();
  };
  window.addEventListener("focus", requestSync);
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Another tab linked or unlinked a folder.
  const tabChannel = new BroadcastChannel(CHANNEL_NAME);
  tabChannel.onmessage = () => void restore(current);
  channel = tabChannel;

  updatePolling();
  void restore(current);

  return () => {
    generation++;
    for (const unsubscribe of unsubscribes) unsubscribe();
    window.removeEventListener("focus", requestSync);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    tabChannel.close();
    if (channel === tabChannel) channel = null;
    clearInterval(pollTimer);
    pollTimer = undefined;
    getEditorView = () => null;
  };
};

/** Asks for a folder and starts syncing with it. Needs a user gesture. */
const enableFolderSync = async (): Promise<void> => {
  try {
    const directory = await pickSyncDirectory();
    if (!directory) return;
    await saveSyncDirectory(directory);
    // Whatever was agreed with a previous folder says nothing about this one.
    bases.clear();
    const picked = { directory };
    link = picked;
    channel?.postMessage(null);
    showToast(`Syncing with "${directory.name}"`, "success");
    resume(picked);
  } catch (error) {
    showToast(`Could not start folder sync: ${errorMessage(error)}`, "error");
  }
};

/** Asks the browser to allow access to the linked folder again. Needs a user gesture. */
const reconnectFolderSync = async (): Promise<void> => {
  const current = link;
  if (!current) return;
  try {
    const permission = await requestFolderPermission(current.directory);
    if (permission !== "granted" || current !== link) return;
    resume(current);
  } catch (error) {
    showToast(`Could not reconnect folder sync: ${errorMessage(error)}`, "error");
  }
};

/** Stops syncing. The files stay in the folder. */
const disableFolderSync = async (): Promise<void> => {
  link = null;
  bases.clear();
  setState({ status: "off" });
  dismissToast(RECONNECT_TOAST_ID);
  try {
    await clearSyncDirectory();
    channel?.postMessage(null);
    showToast("Folder sync turned off");
  } catch (error) {
    showToast(`Could not turn off folder sync: ${errorMessage(error)}`, "error");
  }
};

export const toggleFolderSync = (state: FolderSyncState): Promise<void> => {
  switch (state.status) {
    case "off":
      return enableFolderSync();
    case "needs-permission":
      return reconnectFolderSync();
    case "on":
      return disableFolderSync();
    default:
      return Promise.resolve();
  }
};
