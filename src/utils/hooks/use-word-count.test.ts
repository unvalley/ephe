import { describe, it, expect } from "vitest";
import { countWords } from "./use-word-count";

describe("countWords", () => {
  it("counts English words correctly", () => {
    expect(countWords("Hello world")).toBe(2);
    expect(countWords("This is a test")).toBe(4);
    expect(countWords("  Multiple   spaces   between   words  ")).toBe(4);
  });

  it("counts Japanese words correctly", () => {
    expect(countWords("こんにちは")).toBe(1); // "こんにちは" as one word
    expect(countWords("カタカナ")).toBe(1); // "カタカナ" as one word
    expect(countWords("日本語")).toBe(1); // "日本語" as one word
    expect(countWords("私は学生です")).toBe(4); // 私/は/学生/です
  });

  it("counts Korean words correctly", () => {
    expect(countWords("안녕하세요")).toBe(1); // "안녕하세요" as one word
    expect(countWords("한국어")).toBe(1); // "한국어" as one word
  });

  it("counts mixed language text correctly", () => {
    expect(countWords("Hello 世界")).toBe(2); // 1 English word + 1 Japanese word
    expect(countWords("This is 日本語 text")).toBe(4); // 3 English words + 1 Japanese word
  });

  it("handles punctuation correctly", () => {
    expect(countWords("Hello, world!")).toBe(2);
    expect(countWords("これは、テストです。")).toBe(4); // これ/は/テスト/です
  });

  it("handles empty and whitespace strings", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("\n\t")).toBe(0);
  });
});
