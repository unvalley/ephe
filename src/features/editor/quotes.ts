export const WRITING_QUOTES = [
  "The scariest moment is always just before you start.",
  "Fill your paper with the breathings of your heart.",
  "The pen is mightier than the sword.",
  "The best way to predict the future is to invent it.",
  "The only way to do great work is to love what you do.",
  "A word after a word after a word is power.",
  "Get things done.",
  "Later equals never.",
  "Divide and conquer.",
];

export const getRandomQuote = (): string => {
  return WRITING_QUOTES[Math.floor(Math.random() * WRITING_QUOTES.length)];
};

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it("should return a quote from the WRITING_QUOTES array", () => {
    // Run multiple times to increase confidence due to randomness
    for (let i = 0; i < 5; i++) {
      const quote = getRandomQuote();
      expect(WRITING_QUOTES).toContain(quote);
    }
  });

  it("should return different quotes over multiple calls (probabilistic)", () => {
    const quotes = new Set();
    // Generate multiple quotes, expecting at least some difference
    for (let i = 0; i < 5; i++) {
      quotes.add(getRandomQuote());
    }
    expect(quotes.size).toBeGreaterThan(1);
  });
}
