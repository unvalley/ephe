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

    // Initially, dialog should not be visible
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).not.toBeVisible();

    // open command menu by Ctrl+K（or Cmd+K）
    const isMac = process.platform === "darwin";
    const modifier = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+k`);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveClass(/opacity-100/);

    // close
    await page.keyboard.press(`${modifier}+k`);
    await expect(dialog).not.toBeVisible();
  });

  test("close command menu with Escape key", async ({ page }) => {
    await page.goto("/");

    // Initially, the dialog should not be visible
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).not.toBeVisible();

    // open command menu
    const isMac = process.platform === "darwin";
    const modifier = isMac ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+k`);

    // Dialog should now be visible
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveClass(/opacity-100/);

    await expect(page.locator('input[placeholder="Type a command or search..."]')).toBeFocused();
    await page.keyboard.press("Escape");

    // Dialog should not be visible again
    await expect(dialog).not.toBeVisible();
  });

  test("opening system menu by mouse keeps editor focus", async ({ page }) => {
    await page.goto("/");

    const editor = page.getByTestId("code-mirror-editor");
    await editor.focus();
    await expect(page.locator(".cm-editor")).toHaveClass(/cm-focused/);

    await page.getByRole("button", { name: "System" }).click();

    await expect(page.getByText("Characters")).toBeVisible();
    await expect(page.locator(".cm-editor")).toHaveClass(/cm-focused/);
    await expect(page.locator(".cm-content")).toBeFocused();
  });

  test("opening system menu by keyboard focuses the menu", async ({ page }) => {
    await page.goto("/");

    const systemButton = page.getByRole("button", { name: "System" });
    await systemButton.focus();
    await page.keyboard.press("Enter");

    const systemMenu = page.getByRole("menu", { name: "System" });
    await expect(systemMenu).toBeVisible();
    await expect(systemMenu).toBeFocused();
  });

  test("clicking outside the editor restores editor focus", async ({ page }) => {
    await page.goto("/");

    const systemButton = page.getByRole("button", { name: "System" });
    await systemButton.focus();
    await expect(systemButton).toBeFocused();

    const footerBox = await page.locator("footer").boundingBox();
    expect(footerBox).not.toBeNull();

    if (!footerBox) return;

    await page.mouse.click(footerBox.x + 140, footerBox.y + footerBox.height / 2);

    await expect(page.locator(".cm-editor")).toHaveClass(/cm-focused/);
    await expect(page.locator(".cm-content")).toBeFocused();
  });

  test("clicking the left edge places the cursor on the nearest editor line", async ({ page }) => {
    await page.goto("/");

    const editor = page.getByTestId("code-mirror-editor");
    await editor.focus();
    await page.keyboard.type("aaaaaaaaaa");

    const firstLine = page.locator(".cm-line").first();
    await expect(firstLine).toContainText("aaaaaaaaaa");

    const firstLineBox = await firstLine.boundingBox();
    expect(firstLineBox).not.toBeNull();

    if (!firstLineBox) return;

    await page.mouse.click(10, firstLineBox.y + firstLineBox.height / 2);
    await page.keyboard.type("b");

    await expect(page.locator(".cm-content")).toContainText("baaaaaaaaaa");
    await expect(page.locator(".cm-content")).toBeFocused();
  });

  test("cursor height follows heading font size", async ({ page }) => {
    await page.goto("/");

    const editor = page.getByTestId("code-mirror-editor");
    await editor.focus();
    await page.keyboard.type("# Heading\nbody");

    const headingLine = page.locator(".cm-line").first();
    const bodyLine = page.locator(".cm-line").nth(1);
    const headingBox = await headingLine.boundingBox();
    const bodyBox = await bodyLine.boundingBox();

    expect(headingBox).not.toBeNull();
    expect(bodyBox).not.toBeNull();

    if (!headingBox || !bodyBox) return;

    await page.mouse.click(headingBox.x + 80, headingBox.y + headingBox.height / 2);
    await page.waitForTimeout(50);
    const headingCursorBox = await page.locator(".cm-cursor").first().boundingBox();

    await page.mouse.click(bodyBox.x + 40, bodyBox.y + bodyBox.height / 2);
    await page.waitForTimeout(50);
    const bodyCursorBox = await page.locator(".cm-cursor").first().boundingBox();

    expect(headingCursorBox).not.toBeNull();
    expect(bodyCursorBox).not.toBeNull();

    if (!headingCursorBox || !bodyCursorBox) return;

    expect(headingCursorBox.height).toBeGreaterThan(bodyCursorBox.height);
  });

  test("clicking outside an open system menu keeps editor focus", async ({ page }) => {
    await page.goto("/");

    const editor = page.getByTestId("code-mirror-editor");
    await editor.focus();
    await page.getByRole("button", { name: "System" }).click();
    await expect(page.getByRole("menu", { name: "System" })).toBeVisible();

    await page.mouse.click(300, 780);

    await expect(page.getByRole("menu", { name: "System" })).not.toBeVisible();
    await expect(page.locator(".cm-editor")).toHaveClass(/cm-focused/);
    await expect(page.locator(".cm-content")).toBeFocused();
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
