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
    const editor = page.getByTestId("code-mirror-editor");
    await editor.focus();

    // Use type method with increased delay for more reliable input
    await editor.type("# Hello World", { delay: 100 });

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

  test("URL link styling and tooltip", async ({ page }) => {
    await page.goto("/");

    // Type URL in editor
    await page.waitForSelector(".cm-editor");
    const editor = page.getByTestId("code-mirror-editor");
    await editor.focus();
    await editor.type("Check this link: https://example.com", { delay: 100 });

    // Wait for URL decoration to be applied
    await page.waitForTimeout(1000);

    // Check that URL has underline styling - find any element containing the URL
    const contentArea = page.locator(".cm-content");
    await expect(contentArea).toContainText("https://example.com");

    // Find the styled URL element
    const styledUrl = page.locator('.cm-content [style*="text-decoration"]').first();
    await expect(styledUrl).toBeVisible();

    // Test hover tooltip
    await styledUrl.hover();
    await page.waitForTimeout(500);

    // Check if tooltip appears
    const tooltip = page.locator("text=Opt+Click to open link");
    await expect(tooltip).toBeVisible();
  });

  test("Markdown link styling", async ({ page }) => {
    await page.goto("/");

    // Type markdown link in editor
    await page.waitForSelector(".cm-editor");
    const editor = page.getByTestId("code-mirror-editor");
    await editor.focus();
    await editor.type("[Example](https://example.com)", { delay: 100 });

    // Wait for URL decoration to be applied
    await page.waitForTimeout(1000);

    // Check that content contains the markdown link
    const contentArea = page.locator(".cm-content");
    await expect(contentArea).toContainText("[Example](https://example.com)");

    // Find any element with URL styling
    const styledElement = page.locator('.cm-content [style*="text-decoration"]').first();
    await expect(styledElement).toBeVisible();

    // Test hover tooltip on styled element
    await styledElement.hover();
    await page.waitForTimeout(500);

    // Check if tooltip appears
    const tooltip = page.locator("text=Opt+Click to open link");
    await expect(tooltip).toBeVisible();
  });
});
