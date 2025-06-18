import { describe, test, expect, vi, beforeEach, afterAll } from "vitest";
import { getPlatform, isMac, isWindows, isLinux, getModifierKeyName } from "./platform";

describe("platform utilities", () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getPlatform", () => {
    test("detects macOS", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        configurable: true,
      });
      expect(getPlatform()).toBe("mac");
    });

    test("detects Windows", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      });
      expect(getPlatform()).toBe("windows");
    });

    test("defaults to Linux for other platforms", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (X11; Linux x86_64)",
        configurable: true,
      });
      expect(getPlatform()).toBe("linux");
    });
  });

  describe("platform checks", () => {
    test("isMac returns true for macOS", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        configurable: true,
      });
      expect(isMac()).toBe(true);
      expect(isWindows()).toBe(false);
      expect(isLinux()).toBe(false);
    });

    test("isWindows returns true for Windows", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      });
      expect(isMac()).toBe(false);
      expect(isWindows()).toBe(true);
      expect(isLinux()).toBe(false);
    });

    test("isLinux returns true for Linux", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (X11; Linux x86_64)",
        configurable: true,
      });
      expect(isMac()).toBe(false);
      expect(isWindows()).toBe(false);
      expect(isLinux()).toBe(true);
    });
  });

  describe("modifier keys", () => {
    test("returns metaKey for macOS", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        configurable: true,
      });
      expect(getModifierKeyName()).toBe("Cmd");
    });

    test("returns ctrlKey for Windows", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      });
      expect(getModifierKeyName()).toBe("Ctrl");
    });

    test("returns ctrlKey for Linux", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (X11; Linux x86_64)",
        configurable: true,
      });
      expect(getModifierKeyName()).toBe("Ctrl");
    });
  });

  // Restore original userAgent
  afterAll(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });
});
