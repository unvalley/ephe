import { describe, it, expect } from "vitest";
import { Text } from "@codemirror/state";
import { getParagraphRange } from "./focus-mode";

const docOf = (content: string) => Text.of(content.split("\n"));

describe("getParagraphRange", () => {
  it("returns the whole document when there are no blank lines", () => {
    const doc = docOf("line one\nline two\nline three");
    expect(getParagraphRange(doc, 0)).toEqual({ from: 0, to: doc.length });
    expect(getParagraphRange(doc, doc.length)).toEqual({ from: 0, to: doc.length });
  });

  it("expands to blank-line boundaries", () => {
    const doc = docOf("first para\n\nsecond line a\nsecond line b\n\nthird para");
    // Cursor inside "second line a"
    const pos = doc.line(3).from + 2;
    const range = getParagraphRange(doc, pos);
    expect(range.from).toBe(doc.line(3).from);
    expect(range.to).toBe(doc.line(4).to);
  });

  it("treats the first paragraph correctly at document start", () => {
    const doc = docOf("first para\n\nsecond para");
    const range = getParagraphRange(doc, 3);
    expect(range.from).toBe(0);
    expect(range.to).toBe(doc.line(1).to);
  });

  it("treats the last paragraph correctly at document end", () => {
    const doc = docOf("first para\n\nlast para");
    const range = getParagraphRange(doc, doc.length);
    expect(range.from).toBe(doc.line(3).from);
    expect(range.to).toBe(doc.length);
  });

  it("returns the blank line itself when the cursor rests on one", () => {
    const doc = docOf("first\n\nsecond");
    const blankLine = doc.line(2);
    expect(getParagraphRange(doc, blankLine.from)).toEqual({ from: blankLine.from, to: blankLine.to });
  });

  it("treats whitespace-only lines as paragraph separators", () => {
    const doc = docOf("first\n   \nsecond");
    const range = getParagraphRange(doc, doc.line(3).from);
    expect(range.from).toBe(doc.line(3).from);
    expect(range.to).toBe(doc.line(3).to);
  });

  it("keeps a contiguous task list as one block", () => {
    const doc = docOf("# Today\n- [ ] task a\n- [ ] task b\n\nnotes");
    const range = getParagraphRange(doc, doc.line(2).from);
    expect(range.from).toBe(0);
    expect(range.to).toBe(doc.line(3).to);
  });
});
