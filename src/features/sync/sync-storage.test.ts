import { describe, expect, test } from "vitest";
import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { createBaseStore } from "./sync-storage";

const createMemoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
};

describe("base store", () => {
  test("remembers a base per file", () => {
    const bases = createBaseStore(createMemoryStorage());

    bases.set("ephe-1.md", "one\n\n");
    bases.set("ephe-2.md", "");

    expect(bases.get("ephe-1.md")).toBe("one\n\n");
    expect(bases.get("ephe-2.md")).toBe("");
    expect(bases.get("ephe-3.md")).toBeNull();
  });

  test("sees what another tab stored in the meantime", () => {
    const storage = createMemoryStorage();
    const thisTab = createBaseStore(storage);
    const otherTab = createBaseStore(storage);

    thisTab.set("ephe-1.md", "one");
    expect(otherTab.get("ephe-1.md")).toBe("one");

    otherTab.set("ephe-2.md", "two");
    thisTab.set("ephe-1.md", "one!");
    expect(otherTab.get("ephe-1.md")).toBe("one!");
    expect(thisTab.get("ephe-2.md")).toBe("two");
  });

  test("forgets everything when cleared", () => {
    const bases = createBaseStore(createMemoryStorage());
    bases.set("ephe-1.md", "one");

    bases.clear();

    expect(bases.get("ephe-1.md")).toBeNull();
  });

  test.each([
    ["broken JSON", "{not json"],
    ["a non-object", '"text"'],
    ["null", "null"],
  ])("treats %s as no bases at all", (_, stored) => {
    const bases = createBaseStore(createMemoryStorage({ [LOCAL_STORAGE_KEYS.SYNC_BASES]: stored }));

    expect(bases.get("ephe-1.md")).toBeNull();
  });

  test("ignores entries that are not text", () => {
    const stored = JSON.stringify({ "ephe-1.md": 1, "ephe-2.md": "two" });
    const bases = createBaseStore(createMemoryStorage({ [LOCAL_STORAGE_KEYS.SYNC_BASES]: stored }));

    expect(bases.get("ephe-1.md")).toBeNull();
    expect(bases.get("ephe-2.md")).toBe("two");
  });
});
