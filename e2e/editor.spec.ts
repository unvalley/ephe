import { test, expect, type Page } from "@playwright/test";

const mockDocumentPictureInPicture = async (page: Page) => {
  await page.addInitScript(() => {
    const documentPictureInPicture = {
      window: null as Window | null,
      async requestWindow(options?: { disallowReturnToOpener?: boolean; height?: number; width?: number }) {
        (window as Window & { __documentPictureInPictureOptions?: typeof options }).__documentPictureInPictureOptions =
          options;
        const popup = window.open("", "", "width=420,height=560");
        if (!popup) throw new Error("Popup was blocked");
        this.window = popup;
        popup.addEventListener(
          "pagehide",
          () => {
            this.window = null;
          },
          { once: true },
        );
        return popup;
      },
    };
    Object.defineProperty(window, "documentPictureInPicture", {
      configurable: true,
      value: documentPictureInPicture,
    });
  });
};

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

  test("moves the live editor into Picture-in-Picture and back", async ({ page, context }) => {
    await mockDocumentPictureInPicture(page);
    await page.goto("/");

    const editor = page.getByTestId("code-mirror-editor");
    await editor.focus();
    await page.keyboard.type("PiP keeps this edit");

    const popupPromise = context.waitForEvent("page");
    await page.getByRole("button", { name: "Float" }).click();
    const pictureInPicturePage = await popupPromise;

    await expect(page.getByText("Editing in Picture-in-Picture")).toBeVisible();
    await expect(page.getByRole("button", { name: "Floating" })).toBeVisible();
    await expect(pictureInPicturePage.locator(".cm-content")).toContainText("PiP keeps this edit");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __documentPictureInPictureOptions?: { disallowReturnToOpener?: boolean } })
              .__documentPictureInPictureOptions?.disallowReturnToOpener,
        ),
      )
      .toBe(true);

    await pictureInPicturePage.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      window.dispatchEvent(new FocusEvent("focus"));
    });
    await expect
      .poll(() => pictureInPicturePage.evaluate(() => document.activeElement?.classList.contains("cm-content")))
      .toBe(true);
    await pictureInPicturePage.keyboard.type(" after moving");
    await expect(pictureInPicturePage.locator(".cm-content")).toContainText("PiP keeps this edit after moving");

    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await pictureInPicturePage.keyboard.press(`${modifier}+z`);
    await expect(pictureInPicturePage.locator(".cm-content")).toContainText("PiP keeps this edit");
    await pictureInPicturePage.keyboard.press(`${modifier}+a`);
    await pictureInPicturePage.keyboard.type("# PiP heading\n- [ ] task after moving");
    await expect(pictureInPicturePage.locator(".cm-content")).toContainText("# PiP heading");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const documents = JSON.parse(localStorage.getItem("ephe:documents") ?? "[]") as Array<{ content: string }>;
          return documents[0]?.content;
        }),
      )
      .toContain("# PiP heading");

    const viewport = pictureInPicturePage.viewportSize();
    if (!viewport) throw new Error("Picture-in-Picture viewport is unavailable");
    await pictureInPicturePage.mouse.move(viewport.width - 1, viewport.height / 2);
    await pictureInPicturePage.getByRole("button", { name: "Next" }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("ephe:active-document-index"))).toBe("1");
    await expect(pictureInPicturePage.locator(".cm-content")).not.toContainText("# PiP heading");

    await pictureInPicturePage.mouse.move(1, viewport.height / 2);
    await pictureInPicturePage.getByRole("button", { name: "Previous" }).click();
    await expect(pictureInPicturePage.locator(".cm-content")).toContainText("# PiP heading");

    await page.getByRole("button", { name: "Return editor" }).click();
    await expect(page.getByText("Editing in Picture-in-Picture")).not.toBeVisible();
    await expect(page.locator(".cm-content")).toContainText("# PiP heading");
  });

  test("closes Picture-in-Picture when leaving the editor page", async ({ page, context }) => {
    await mockDocumentPictureInPicture(page);
    await page.goto("/");

    const popupPromise = context.waitForEvent("page");
    await page.getByRole("button", { name: "Float" }).click();
    const pictureInPicturePage = await popupPromise;
    await expect(page.getByText("Editing in Picture-in-Picture")).toBeVisible();

    await page.getByRole("link", { name: /^Ephe v/ }).click();

    await expect(page).toHaveURL(/\/landing$/);
    await expect.poll(() => pictureInPicturePage.isClosed()).toBe(true);
  });

  test("keeps editor input active after changing system menu controls", async ({ page }) => {
    await page.goto("/");

    await page.waitForSelector(".cm-editor");
    const editor = page.getByTestId("code-mirror-editor");
    await editor.focus();
    await page.keyboard.type("before ");

    await page.locator("footer").getByRole("button", { name: "System" }).first().click();
    await page.locator(".cosmos-menu-panel").getByRole("button", { name: "System" }).click();

    await expect(page.locator(".cm-editor")).toHaveClass(/cm-focused/);
    await page.keyboard.type("after");

    await expect(page.locator(".cm-content")).toContainText("before after");
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
