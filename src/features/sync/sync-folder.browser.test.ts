import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createSyncFolder, isFolderSyncSupported } from "./sync-folder";

// The origin private file system gives real directory handles without a picker.
const DIRECTORY_NAME = "sync-folder-test";

const writeExternally = async (directory: FileSystemDirectoryHandle, fileName: string, content: string) => {
  const handle = await directory.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
};

const readExternally = async (directory: FileSystemDirectoryHandle, fileName: string): Promise<string> => {
  const handle = await directory.getFileHandle(fileName);
  return (await handle.getFile()).text();
};

const listFiles = async (directory: FileSystemDirectoryHandle): Promise<string[]> => {
  const names: string[] = [];
  for await (const name of directory.keys()) names.push(name);
  return names.sort();
};

describe("sync folder", () => {
  let root: FileSystemDirectoryHandle;
  let directory: FileSystemDirectoryHandle;

  beforeEach(async () => {
    root = await navigator.storage.getDirectory();
    directory = await root.getDirectoryHandle(DIRECTORY_NAME, { create: true });
  });

  afterEach(async () => {
    await root.removeEntry(DIRECTORY_NAME, { recursive: true });
  });

  test("detects the picker without assuming browser support", () => {
    expect(isFolderSyncSupported({} as Window)).toBe(false);
    expect(isFolderSyncSupported({ showDirectoryPicker: async () => directory } as unknown as Window)).toBe(true);
  });

  test("reads a missing file as null and an empty file as empty", async () => {
    const folder = createSyncFolder(directory);
    await writeExternally(directory, "empty.md", "");

    expect(await folder.read("missing.md")).toBeNull();
    expect(await folder.read("empty.md")).toBe("");
  });

  test("surfaces a name it cannot read instead of calling it missing", async () => {
    const folder = createSyncFolder(directory);
    await directory.getDirectoryHandle("ephe.md", { create: true });

    await expect(folder.read("ephe.md")).rejects.toThrow();
  });

  test("commits new content and reads it back unchanged", async () => {
    const folder = createSyncFolder(directory);
    const content = "# 今日\n\n- [ ] café ☕\n\n\n";

    expect(await folder.commit("ephe.md", content, null)).toBe("committed");
    expect(await readExternally(directory, "ephe.md")).toBe(content);
    expect(await folder.read("ephe.md")).toBe(content);
  });

  test("replaces a file only while it still holds the expected content", async () => {
    const folder = createSyncFolder(directory);
    await writeExternally(directory, "ephe.md", "original");

    expect(await folder.commit("ephe.md", "mine", "original")).toBe("committed");
    expect(await readExternally(directory, "ephe.md")).toBe("mine");

    await writeExternally(directory, "ephe.md", "theirs");
    expect(await folder.commit("ephe.md", "mine again", "mine")).toBe("stale");
    expect(await readExternally(directory, "ephe.md")).toBe("theirs");
  });

  test("does not create a file that appeared since it was last seen missing", async () => {
    const folder = createSyncFolder(directory);
    await writeExternally(directory, "ephe.md", "theirs");

    expect(await folder.commit("ephe.md", "mine", null)).toBe("stale");
    expect(await readExternally(directory, "ephe.md")).toBe("theirs");
  });

  test("does not recreate a file that was deleted since it was read", async () => {
    const folder = createSyncFolder(directory);

    expect(await folder.commit("ephe.md", "mine", "original")).toBe("stale");
    expect(await listFiles(directory)).toEqual([]);
  });

  test("reads CRLF files with the line endings the editor uses", async () => {
    const folder = createSyncFolder(directory);
    await writeExternally(directory, "ephe.md", "a\r\nb\r\n");

    expect(await folder.read("ephe.md")).toBe("a\nb\n");
    // Unchanged in the editor's terms, so a commit against that content goes through.
    expect(await folder.commit("ephe.md", "a\nb\nc\n", "a\nb\n")).toBe("committed");
  });

  test("writes each conflict copy under its own name, leaving the document alone", async () => {
    const folder = createSyncFolder(directory);
    await writeExternally(directory, "ephe-2.md", "theirs");

    const first = await folder.writeConflictCopy("ephe-2.md", "mine");
    const second = await folder.writeConflictCopy("ephe-2.md", "mine, later");

    expect(first).toMatch(/^ephe-2 \(conflict \d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2} [a-z0-9]{4}\)\.md$/);
    expect(second).not.toBe(first);
    expect(await readExternally(directory, first)).toBe("mine");
    expect(await readExternally(directory, second)).toBe("mine, later");
    expect(await readExternally(directory, "ephe-2.md")).toBe("theirs");
    expect(await listFiles(directory)).toEqual([first, second, "ephe-2.md"].sort());
  });
});
