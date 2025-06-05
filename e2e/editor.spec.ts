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

    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toHaveClass(/opacity-0/);

    // open command menu by Ctrl+K（ormd+K）
    const isMac = process.platform === "darwin";
    const modifier = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+k`);
    await expect(dialog).toHaveClass(/opacity-100/);

    // close
    await page.keyboard.press(`${modifier}+k`);
    await expect(dialog).toHaveClass(/opacity-0/);
  });

  test("close command menu with Escape key", async ({ page }) => {
    await page.goto("/");

    // Initially, the dialog should have opacity-0 class
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toHaveClass(/opacity-0/);

    // open command menu
    const isMac = process.platform === "darwin";
    const modifier = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+k`);

    // Dialog should now have opacity-100 class
    await expect(dialog).toHaveClass(/opacity-100/);

    await expect(page.locator('input[placeholder="Type a command or search..."]')).toBeFocused();
    await page.keyboard.press("Escape");

    // Dialog should have opacity-0 class again
    await expect(dialog).toHaveClass(/opacity-0/);
  });
});
