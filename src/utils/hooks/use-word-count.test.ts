import { describe, it, expect } from "vitest";
import { countWords } from "./use-word-count";

describe("countWords", () => {
  it("counts English words correctly", () => {
    expect(countWords("Hello world")).toBe(2);
    expect(countWords("This is a test")).toBe(4);
    expect(countWords("  Multiple   spaces   between   words  ")).toBe(4);
  });

  it("counts Chinese characters correctly", () => {
    expect(countWords("你好世界")).toBe(4); // 4 Chinese characters
    expect(countWords("这是一个测试")).toBe(6); // 6 Chinese characters
  });

  it("counts Japanese characters correctly", () => {
    expect(countWords("こんにちは")).toBe(5); // 5 Hiragana characters
    expect(countWords("カタカナ")).toBe(4); // 4 Katakana characters
    expect(countWords("日本語")).toBe(3); // 3 Kanji characters
  });

  it("counts Korean characters correctly", () => {
    expect(countWords("안녕하세요")).toBe(5); // 5 Korean characters
    expect(countWords("한국어")).toBe(3); // 3 Korean characters
  });

  it("counts mixed language text correctly", () => {
    expect(countWords("Hello 世界")).toBe(3); // 1 English word + 2 Chinese characters
    expect(countWords("This is 日本語 text")).toBe(6); // 3 English words + 3 Japanese characters
    expect(countWords("混合text测试")).toBe(5); // 2 Chinese + 1 English + 2 Chinese
  });

  it("handles punctuation correctly", () => {
    expect(countWords("Hello, world!")).toBe(2);
    expect(countWords("你好，世界！")).toBe(4); // CJK punctuation removed
    expect(countWords("これは、テストです。")).toBe(8); // Japanese punctuation removed
  });

  it("handles empty and whitespace strings", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("\n\t")).toBe(0);
  });
});