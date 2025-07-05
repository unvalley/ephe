import { useAtom } from "jotai";
import { atom } from "jotai";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { useEffect } from "react";

export const wordCountAtom = atom<number>(0);

export const useWordCount = () => {
  const [wordCount, setWordCount] = useAtom(wordCountAtom);

  // Initialize word count from editor content if not already set
  useEffect(() => {
    if (wordCount === 0) {
      const editorContent = localStorage.getItem(LOCAL_STORAGE_KEYS.EDITOR_CONTENT);
      if (editorContent == null) {
        setWordCount(0);
      } else {
        const content = editorContent.slice(1, -1); // Remove quotes
        setWordCount(countWords(content));
      }
    }
  }, [wordCount, setWordCount]);

  return { wordCount, setWordCount };
};

export const countWords = (text: string): number => {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Match word boundaries or CJK characters
  // \b\w+\b matches word boundaries (works for Latin-based languages)
  // [\u4E00-\u9FFF] matches CJK ideographs (Chinese/Japanese Kanji)
  // [\u3040-\u309F\u30A0-\u30FF] matches Japanese Hiragana and Katakana
  // [\uAC00-\uD7AF] matches Korean Hangul
  const wordPattern = /\b\w+\b|[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g;
  
  const matches = text.match(wordPattern) || [];
  return matches.length;
};