import { describe, expect, test } from "vitest";
import { copyDocumentStyles, getDocumentPictureInPicture } from "./document-picture-in-picture";

describe("document picture-in-picture helpers", () => {
  test("detects the API without assuming browser support", () => {
    const unsupportedWindow = {} as Window;
    const supportedWindow = {
      documentPictureInPicture: {
        window: null,
        requestWindow: async () => window,
      },
    } as unknown as Window;

    expect(getDocumentPictureInPicture(unsupportedWindow)).toBeUndefined();
    expect(getDocumentPictureInPicture(supportedWindow)).toBeDefined();
  });

  test("copies app styles without duplicating runtime styles", () => {
    const source = document.implementation.createHTMLDocument("source");
    const target = document.implementation.createHTMLDocument("target");
    const appStyle = source.createElement("style");
    appStyle.dataset.viteDevId = "/src/globals.css";
    appStyle.textContent = ".ephe-test { color: rgb(1, 2, 3); }";
    source.head.append(appStyle);
    const appStylesheet = source.createElement("link");
    appStylesheet.rel = "stylesheet";
    appStylesheet.href = "/assets/app.css";
    source.head.append(appStylesheet);
    const runtimeStyle = source.createElement("style");
    runtimeStyle.textContent = ".runtime-style { color: rgb(4, 5, 6); }";
    source.head.append(runtimeStyle);

    copyDocumentStyles(source, target);

    expect(target.head.querySelector("style")?.textContent).toContain(".ephe-test");
    expect(target.head.querySelector("style")?.textContent).toContain("rgb(1, 2, 3)");
    expect(target.head.querySelector("link")?.getAttribute("href")).toBe("/assets/app.css");
    expect(target.head.textContent).not.toContain(".runtime-style");
  });
});
