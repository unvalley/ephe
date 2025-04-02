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
