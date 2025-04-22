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

  test("interact with system menu", async ({ page }) => {
    await page.goto("/");
    
    // Locate the System button in footer
    const systemButton = page.getByRole('button', { name: /System/i }).first();
    await expect(systemButton).toBeVisible();
    
    // Click the System button to open menu
    await systemButton.click();
    
    // Check that menu appears
    const menu = page.locator('div[role="menu"]');
    await expect(menu).toBeVisible();
    
    // Verify some expected menu items are present
    await expect(page.getByText(/Document Stats/i)).toBeVisible();
    await expect(page.getByText(/Appearence/i)).toBeVisible();
    
    // Close menu by clicking elsewhere
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
  });
});
