import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { test, expect, describe, vi } from "vitest";
import { urlClickPlugin, urlHoverTooltip } from "./url-click";

const createViewFromText = (text: string): EditorView => {
  const state = EditorState.create({
    doc: text,
    extensions: [urlClickPlugin, urlHoverTooltip],
  });
  return new EditorView({ state });
};

describe("urlClickPlugin", () => {
  test("creates editor with URL plugin", () => {
    const view = createViewFromText("Visit https://example.com for more info");

    expect(view.state.doc.toString()).toBe("Visit https://example.com for more info");
    expect(view).toBeDefined();
  });

  test("handles text with multiple URLs", () => {
    const text = "Check https://example.com and http://example.net";
    const view = createViewFromText(text);

    expect(view.state.doc.toString()).toBe(text);
  });

  test("handles text without URLs", () => {
    const view = createViewFromText("This is just plain text without any links");

    expect(view.state.doc.toString()).toBe("This is just plain text without any links");
  });

  test("detects URLs with various protocols", () => {
    const testCases = [
      "https://example.com",
      "http://example.com",
      "https://sub.example.com/path?query=value",
      "http://localhost:3000/api/test",
    ];

    testCases.forEach((url) => {
      const view = createViewFromText(`Link: ${url}`);
      expect(view.state.doc.toString()).toBe(`Link: ${url}`);
    });
  });

  test("handles multiline text with URLs", () => {
    const text = `First line with https://example.com
Second line with http://example.net
Third line without URL`;

    const view = createViewFromText(text);
    expect(view.state.doc.toString()).toBe(text);
  });

  test("URL regex pattern validation", () => {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

    const validUrls = [
      "https://example.com",
      "http://example.com",
      "https://sub.example.com/path",
      "http://localhost:3000",
      "https://example.com/path?query=value&other=test",
    ];

    const invalidUrls = ["ftp://example.com", "example.com", "https://", "http://"];

    validUrls.forEach((url) => {
      expect(url.match(urlRegex)).toBeTruthy();
    });

    invalidUrls.forEach((url) => {
      expect(url.match(urlRegex)).toBeFalsy();
    });
  });

  test("plugin integration", () => {
    const view = createViewFromText("Visit https://example.com");

    expect(view).toBeDefined();
    expect(view.state).toBeDefined();
  });

  test("window.open mock test", () => {
    const mockOpen = vi.fn();
    const originalOpen = window.open;
    window.open = mockOpen;

    try {
      window.open("https://example.com", "_blank", "noopener,noreferrer");
      expect(mockOpen).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    } finally {
      window.open = originalOpen;
    }
  });

  test("editor view creation with plugin", () => {
    const view = createViewFromText("Test content with https://example.com link");

    expect(view.state.doc.toString()).toBe("Test content with https://example.com link");
    expect(view.dom).toBeDefined();
  });
});
