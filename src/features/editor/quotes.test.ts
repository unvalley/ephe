import { test, expect, describe } from "vitest";
import { getRandomQuote, WRITING_QUOTES } from "./quotes";

describe("getRandomQuote", () => {
  test("should return a quote from the WRITING_QUOTES array", () => {
    // Run multiple times to increase confidence due to randomness
    for (let i = 0; i < 5; i++) {
      const quote = getRandomQuote();
      expect(WRITING_QUOTES).toContain(quote);
    }
  });

  test("should return different quotes over multiple calls (probabilistic)", () => {
    const quotes = new Set();
    // Generate multiple quotes, expecting at least some difference
    for (let i = 0; i < 5; i++) {
      quotes.add(getRandomQuote());
    }
    expect(quotes.size).toBeGreaterThan(1);
  });
});
