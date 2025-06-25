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

// CJK character ranges
const CJK_REGEX = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g;
const CJK_PUNCTUATION = /[\u3000-\u303F\uFF00-\uFFEF]/g;

export const countWords = (text: string): number => {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Remove CJK punctuation from the text
  const cleanText = text.replace(CJK_PUNCTUATION, ' ');
  
  // Extract CJK characters
  const cjkMatches = cleanText.match(CJK_REGEX) || [];
  const cjkCount = cjkMatches.length;
  
  // Remove CJK characters from text to count non-CJK words
  const nonCjkText = cleanText.replace(CJK_REGEX, ' ');
  
  // Count non-CJK words (space-separated)
  const nonCjkWords = nonCjkText.trim().split(/\s+/).filter(word => word.length > 0);
  const nonCjkCount = nonCjkWords.length;
  
  // Total count: CJK characters + non-CJK words
  return cjkCount + nonCjkCount;
};