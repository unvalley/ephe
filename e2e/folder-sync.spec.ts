import { test as base, chromium, expect, type Page } from "@playwright/test";

const SYNC_DIRECTORY = "ephe-sync";

// A stored directory handle is read back when the page loads again. Chromium
// only supports that in a regular profile, not in the throwaway contexts
// Playwright creates by default, so these tests run in a persistent one.
const test = base.extend({
  context: async ({ baseURL }, use, testInfo) => {
    const context = await chromium.launchPersistentContext(testInfo.outputPath("profile"), { baseURL });
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },
});

// The native folder picker cannot be driven from a test, so it hands out a
// directory of the origin private file system instead: real handles, real files.
const mockFolderPicker = async (page: Page) => {
  await page.addInitScript((directoryName) => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async () => {
        const root = await navigator.storage.getDirectory();
        return root.getDirectoryHandle(directoryName, { create: true });
      },
    });
  }, SYNC_DIRECTORY);
};

// Makes the next page load behave like a new browser session, where access to
// the folder has to be granted again.
const revokeFolderPermissionOnNextLoad = async (page: Page) => {
  await page.addInitScript(() => {
    let permission: PermissionState = "prompt";
    Object.assign(FileSystemDirectoryHandle.prototype, {
      queryPermission: async () => permission,
      requestPermission: async () => {
        permission = "granted";
        return permission;
      },
    });
  });
};

const readSyncFile = (page: Page, fileName: string) =>
  page.evaluate(
    async ({ directoryName, fileName }) => {
      const root = await navigator.storage.getDirectory();
      const directory = await root.getDirectoryHandle(directoryName, { create: true });
      try {
        const handle = await directory.getFileHandle(fileName);
        return await (await handle.getFile()).text();
      } catch {
        return null;
      }
    },
    { directoryName: SYNC_DIRECTORY, fileName },
  );

// Stands in for the other browser writing to the shared folder.
const writeSyncFile = (page: Page, fileName: string, content: string) =>
  page.evaluate(
    async ({ directoryName, fileName, content }) => {
      const root = await navigator.storage.getDirectory();
      const directory = await root.getDirectoryHandle(directoryName, { create: true });
      const handle = await directory.getFileHandle(fileName, { create: true });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    },
    { directoryName: SYNC_DIRECTORY, fileName, content },
  );

const listSyncFiles = (page: Page) =>
  page.evaluate(async (directoryName) => {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle(directoryName, { create: true });
    const names: string[] = [];
    for await (const name of directory.keys()) names.push(name);
    return names.sort();
  }, SYNC_DIRECTORY);

const folderSyncRow = (page: Page) => page.getByRole("button", { name: /^Folder sync/ });

const toggleFolderSync = async (page: Page) => {
  await page.getByRole("button", { name: "System" }).click();
  await folderSyncRow(page).click();
};

const typeInEditor = async (page: Page, text: string) => {
  await page.locator(".cm-content").click();
  await page.keyboard.type(text);
};

test.describe("Folder sync", () => {
  test.beforeEach(async ({ page }) => {
    await mockFolderPicker(page);
    await page.goto("/");
    await expect(page.locator(".cm-editor")).toBeVisible();
  });

  test("mirrors the document to the folder and follows edits made to the file", async ({ page }) => {
    await toggleFolderSync(page);
    await expect(folderSyncRow(page)).toContainText(SYNC_DIRECTORY);
    // Nothing is created for documents that are still empty.
    expect(await listSyncFiles(page)).toEqual([]);

    await typeInEditor(page, "Written in this browser");
    await expect.poll(() => readSyncFile(page, "ephe-1.md")).toBe("Written in this browser");
    expect(await listSyncFiles(page)).toEqual(["ephe-1.md"]);

    await writeSyncFile(page, "ephe-1.md", "Written in the other browser\n\n");
    await expect(page.locator(".cm-content")).toContainText("Written in the other browser");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const documents = JSON.parse(localStorage.getItem("ephe:documents") ?? "[]") as Array<{ content: string }>;
          return documents[0]?.content;
        }),
      )
      .toBe("Written in the other browser\n\n");

    // The file going back to what this editor last wrote is still an external change.
    await writeSyncFile(page, "ephe-1.md", "Written in this browser");
    await expect(page.locator(".cm-content")).toHaveText("Written in this browser");

    await typeInEditor(page, " again");
    await expect.poll(() => readSyncFile(page, "ephe-1.md")).toContain("again");
  });

  test("keeps this browser's notes as a copy when the folder already holds different ones", async ({ page }) => {
    await typeInEditor(page, "Notes from this browser");
    await writeSyncFile(page, "ephe-1.md", "Notes from the other browser");

    await toggleFolderSync(page);

    await expect(page.locator(".cm-content")).toHaveText("Notes from the other browser");
    await expect(page.getByText("Sync conflict in ephe-1.md")).toBeVisible();
    expect(await readSyncFile(page, "ephe-1.md")).toBe("Notes from the other browser");

    const files = await listSyncFiles(page);
    expect(files).toHaveLength(2);
    const conflictCopy = files.find((name) => name.startsWith("ephe-1 (conflict "));
    expect(conflictCopy).toBeDefined();
    expect(await readSyncFile(page, conflictCopy ?? "")).toBe("Notes from this browser");
  });

  test("pauses after a reload until access is allowed again, then catches up", async ({ page }) => {
    await toggleFolderSync(page);
    await typeInEditor(page, "Before the reload");
    await expect.poll(() => readSyncFile(page, "ephe-1.md")).toBe("Before the reload");

    await revokeFolderPermissionOnNextLoad(page);
    await page.reload();
    await expect(page.getByText("Folder sync is paused")).toBeVisible();

    // The other browser keeps writing while this one has no access.
    await writeSyncFile(page, "ephe-1.md", "Edited while paused");
    await page.waitForTimeout(2500);
    await expect(page.locator(".cm-content")).toHaveText("Before the reload");

    await page.getByRole("button", { name: "Reconnect" }).click();
    await expect(page.locator(".cm-content")).toHaveText("Edited while paused");
    await expect(page.getByText("Folder sync is paused")).toHaveCount(0);
  });

  test("stops mirroring once turned off and leaves the files in place", async ({ page }) => {
    await toggleFolderSync(page);
    await typeInEditor(page, "Synced");
    await expect.poll(() => readSyncFile(page, "ephe-1.md")).toBe("Synced");

    await toggleFolderSync(page);
    await expect(folderSyncRow(page)).toContainText("Off");

    await typeInEditor(page, " and then some");
    await page.waitForTimeout(2500);
    expect(await readSyncFile(page, "ephe-1.md")).toBe("Synced");

    await page.reload();
    await page.getByRole("button", { name: "System" }).click();
    await expect(folderSyncRow(page)).toContainText("Off");
  });

  test("syncs the single-document editor through its own file", async ({ page }) => {
    await page.getByRole("button", { name: "System" }).click();
    await page.getByRole("button", { name: "Single" }).click();
    await folderSyncRow(page).click();
    await expect(folderSyncRow(page)).toContainText(SYNC_DIRECTORY);

    await typeInEditor(page, "One page");
    await expect.poll(() => readSyncFile(page, "ephe.md")).toBe("One page");
    expect(await listSyncFiles(page)).toEqual(["ephe.md"]);

    await writeSyncFile(page, "ephe.md", "One page, edited elsewhere");
    await expect(page.locator(".cm-content")).toHaveText("One page, edited elsewhere");
  });

  test("a second tab follows the folder linked in the first", async ({ page, context }) => {
    const secondTab = await context.newPage();
    await mockFolderPicker(secondTab);
    await secondTab.goto("/");
    await expect(secondTab.locator(".cm-editor")).toBeVisible();

    await toggleFolderSync(page);
    await expect(folderSyncRow(page)).toContainText(SYNC_DIRECTORY);

    await secondTab.getByRole("button", { name: "System" }).click();
    await expect(folderSyncRow(secondTab)).toContainText(SYNC_DIRECTORY);

    await folderSyncRow(secondTab).click();
    await expect(folderSyncRow(secondTab)).toContainText("Off");
    await expect(folderSyncRow(page)).toContainText("Off");
  });
});
