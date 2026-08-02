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

  test("copies inline stylesheet rules into another document", () => {
    const source = document.implementation.createHTMLDocument("source");
    const target = document.implementation.createHTMLDocument("target");
    const style = source.createElement("style");
    style.textContent = ".ephe-test { color: rgb(1, 2, 3); }";
    source.head.append(style);

    copyDocumentStyles(source, target);

    expect(target.head.querySelector("style")?.textContent).toContain(".ephe-test");
    expect(target.head.querySelector("style")?.textContent).toContain("rgb(1, 2, 3)");
  });
});
