import { conflictFileName, normalizeLineEndings } from "./sync-plan";

type PermissionDescriptor = { mode: "read" | "readwrite" };

type DirectoryPickerOptions = PermissionDescriptor & { id?: string; startIn?: "documents" };

type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
};

type HandleWithPermission = FileSystemHandle & {
  queryPermission?: (descriptor: PermissionDescriptor) => Promise<PermissionState>;
  requestPermission?: (descriptor: PermissionDescriptor) => Promise<PermissionState>;
};

const READ_WRITE: PermissionDescriptor = { mode: "readwrite" };
const READ_TIMEOUT_MS = 10_000;
const CONFLICT_NAME_ATTEMPTS = 5;

export const isFolderSyncSupported = (targetWindow: Window = window): boolean =>
  typeof (targetWindow as WindowWithDirectoryPicker).showDirectoryPicker === "function";

/** Resolves to null when the user dismisses the picker. */
export const pickSyncDirectory = async (targetWindow: Window = window): Promise<FileSystemDirectoryHandle | null> => {
  const { showDirectoryPicker } = targetWindow as WindowWithDirectoryPicker;
  if (!showDirectoryPicker) return null;
  try {
    return await showDirectoryPicker.call(targetWindow, { id: "ephe-sync", startIn: "documents", ...READ_WRITE });
  } catch (error) {
    if (isDomError(error, "AbortError")) return null;
    throw error;
  }
};

// Handles without the permission methods (the origin private file system on older engines) are always usable.
export const queryFolderPermission = async (directory: FileSystemDirectoryHandle): Promise<PermissionState> =>
  (await (directory as HandleWithPermission).queryPermission?.(READ_WRITE)) ?? "granted";

/** Needs a user gesture. */
export const requestFolderPermission = async (directory: FileSystemDirectoryHandle): Promise<PermissionState> =>
  (await (directory as HandleWithPermission).requestPermission?.(READ_WRITE)) ?? "granted";

const isDomError = (error: unknown, name: string): boolean => error instanceof DOMException && error.name === name;

// A read of a cloud placeholder can hang while it downloads. Giving up lets the
// next pass try again instead of stalling every document behind this one.
const withTimeout = async <T>(task: Promise<T>, fileName: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out reading ${fileName}`)), READ_TIMEOUT_MS);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

const readOnce = async (directory: FileSystemDirectoryHandle, fileName: string): Promise<string | null> => {
  try {
    const handle = await directory.getFileHandle(fileName);
    const file = await handle.getFile();
    return normalizeLineEndings(await file.text());
  } catch (error) {
    // Only a missing file reads as "no file"; every other failure must surface
    // so that unreadable content is never mistaken for an empty document.
    if (isDomError(error, "NotFoundError")) return null;
    throw error;
  }
};

const read = async (directory: FileSystemDirectoryHandle, fileName: string): Promise<string | null> => {
  try {
    return await withTimeout(readOnce(directory, fileName), fileName);
  } catch (error) {
    // The file changed between `getFile()` and `text()`; the second look sees the new version.
    if (isDomError(error, "NotReadableError")) return withTimeout(readOnce(directory, fileName), fileName);
    throw error;
  }
};

// `createWritable()` writes to a swap file that replaces the target on
// `close()`, so a reader sees the old or the new content, never a partial one.
const write = async (handle: FileSystemFileHandle, content: string): Promise<void> => {
  const writable = await handle.createWritable();
  try {
    await writable.write(content);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
};

const randomSuffix = (): string => Math.random().toString(36).slice(2, 6).padEnd(4, "0");

export type SyncFolder = {
  /** Content of `fileName`, or null when the file does not exist. */
  read: (fileName: string) => Promise<string | null>;
  /**
   * Replaces `fileName` only while it still holds `expected` (null: does not exist).
   * The API has no compare-and-swap, so a write landing between the check and
   * the replacement is still overwritten; the check narrows that to milliseconds.
   */
  commit: (fileName: string, content: string, expected: string | null) => Promise<"committed" | "stale">;
  /** Stores `content` beside `fileName` under a name that is not in use and returns that name. */
  writeConflictCopy: (fileName: string, content: string) => Promise<string>;
};

export const createSyncFolder = (directory: FileSystemDirectoryHandle): SyncFolder => ({
  read: (fileName) => read(directory, fileName),

  commit: async (fileName, content, expected) => {
    if ((await read(directory, fileName)) !== expected) return "stale";
    await write(await directory.getFileHandle(fileName, { create: true }), content);
    return "committed";
  },

  writeConflictCopy: async (fileName, content) => {
    for (let attempt = 0; attempt < CONFLICT_NAME_ATTEMPTS; attempt++) {
      const name = conflictFileName(fileName, new Date(), randomSuffix());
      if ((await read(directory, name)) !== null) continue;
      await write(await directory.getFileHandle(name, { create: true }), content);
      return name;
    }
    throw new Error(`Could not find a free name for the conflict copy of ${fileName}`);
  },
});
