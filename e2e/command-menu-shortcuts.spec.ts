import { expect, test } from "@playwright/test";

const platforms = [
  { name: "macOS", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", modifier: "Meta" },
  { name: "Windows", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", modifier: "Control" },
  { name: "Linux", userAgent: "Mozilla/5.0 (X11; Linux x86_64)", modifier: "Control" },
];

for (const { name, userAgent, modifier } of platforms) {
  test.describe(`${name} command menu shortcut`, () => {
    test.use({ userAgent });

    test("uses the platform modifier without intercepting macOS Control+K", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(".cm-editor")).toBeVisible();
      await page.locator(".cm-content").focus();

      const dialog = page.getByRole("dialog");
      await expect(dialog).not.toBeVisible();

      if (name === "macOS") {
        await page.keyboard.press("Control+k");
        await expect(dialog).not.toBeVisible();
      }

      await page.keyboard.press(`${modifier}+k`);
      await expect(dialog).toBeVisible();

      if (name === "macOS") {
        await page.keyboard.press("Control+k");
        await expect(dialog).toBeVisible();
      }

      await page.keyboard.press(`${modifier}+k`);
      await expect(dialog).not.toBeVisible();
    });
  });
}
