import { test, expect } from "@playwright/test";

test.describe("Editor Page", () => {
  test("load page", async ({ page }) => {
    await page.goto("/");
    // check loaded
    await expect(page.locator(".cm-editor")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("type text in editor", async ({ page }) => {
    await page.goto("/");

    // text input
    await page.waitForSelector(".cm-editor");
    await page.getByTestId("code-mirror-editor").focus();
    await page.keyboard.type("# Hello World");

    // check input
    const editorContent = await page.locator(".cm-content");
    await expect(editorContent).toContainText("Hello World");
  });

  test("open and close command menu", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();

    // open command menu by Ctrl+K（ormd+K）
    const isMac = process.platform === "darwin";
    const modifier = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+k`);
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // close
    await page.keyboard.press(`${modifier}+k`);
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});
