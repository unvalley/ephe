import { describe, expect, test } from "vitest";
import { conflictFileName, multiFileName, normalizeLineEndings, planSync } from "./sync-plan";

describe("planSync", () => {
  test("does nothing when both sides already agree on the base", () => {
    expect(planSync({ local: "a", remote: "a", base: "a" })).toEqual({ type: "none" });
  });

  test("records the base when both sides agree without one", () => {
    expect(planSync({ local: "a", remote: "a", base: null })).toEqual({ type: "settle" });
    expect(planSync({ local: "a", remote: "a", base: "old" })).toEqual({ type: "settle" });
  });

  test("pushes a local edit", () => {
    expect(planSync({ local: "a!", remote: "a", base: "a" })).toEqual({ type: "push" });
  });

  test("pulls an edit made to the file", () => {
    expect(planSync({ local: "a", remote: "a!", base: "a" })).toEqual({ type: "pull", content: "a!" });
  });

  test("reports a conflict when both sides changed", () => {
    expect(planSync({ local: "mine", remote: "theirs", base: "a" })).toEqual({ type: "conflict", content: "theirs" });
  });

  test("reports a conflict when both sides hold content but never shared a base", () => {
    expect(planSync({ local: "mine", remote: "theirs", base: null })).toEqual({ type: "conflict", content: "theirs" });
  });

  test("clearing a document is an edit like any other", () => {
    expect(planSync({ local: "", remote: "a", base: "a" })).toEqual({ type: "push" });
    expect(planSync({ local: "a", remote: "", base: "a" })).toEqual({ type: "pull", content: "" });
  });

  test("an empty side never produces a conflict copy", () => {
    expect(planSync({ local: "", remote: "theirs", base: null })).toEqual({ type: "pull", content: "theirs" });
    expect(planSync({ local: "", remote: "theirs", base: "a" })).toEqual({ type: "pull", content: "theirs" });
    expect(planSync({ local: "mine", remote: "", base: null })).toEqual({ type: "push" });
  });

  describe("when the file does not exist", () => {
    test("creates it from local content on first sync", () => {
      expect(planSync({ local: "a", remote: null, base: null })).toEqual({ type: "push" });
    });

    test("does not create a file for an empty document", () => {
      expect(planSync({ local: "", remote: null, base: null })).toEqual({ type: "none" });
    });

    test("keeps local content and leaves the folder alone after an external delete", () => {
      expect(planSync({ local: "a", remote: null, base: "a" })).toEqual({ type: "none" });
    });

    test("recreates the file once the document is edited again", () => {
      expect(planSync({ local: "a!", remote: null, base: "a" })).toEqual({ type: "push" });
    });
  });
});

describe("file names", () => {
  test("numbers multi-document files from one", () => {
    expect(multiFileName(0)).toBe("ephe-1.md");
    expect(multiFileName(4)).toBe("ephe-5.md");
  });

  test("names a conflict copy after its document without characters that filesystems reject", () => {
    const name = conflictFileName("ephe-2.md", new Date(2026, 9, 7, 9, 5, 3), "x7k2");
    expect(name).toBe("ephe-2 (conflict 2026-10-07 09-05-03 x7k2).md");
    expect(name).not.toMatch(/[\\/:*?"<>|]/);
  });
});

describe("normalizeLineEndings", () => {
  test("turns CRLF and lone CR into LF", () => {
    expect(normalizeLineEndings("a\r\nb\rc\n")).toBe("a\nb\nc\n");
  });

  test("keeps trailing blank lines and other whitespace", () => {
    expect(normalizeLineEndings("a  \n\n\n")).toBe("a  \n\n\n");
  });
});
