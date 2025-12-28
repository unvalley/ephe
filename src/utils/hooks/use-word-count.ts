import { useAtomValue } from "jotai";
import { atom } from "jotai";
import { editorContentAtom } from "../atoms/editor";
import { editorModeAtom } from "./use-editor-mode";
import { documentsAtom, activeDocumentIndexAtom } from "../atoms/multi-document";

// Derive word count from editor content
export const wordCountAtom = atom((get) => {
  const mode = get(editorModeAtom);

  if (mode === "multi") {
    const docs = get(documentsAtom);
    const idx = get(activeDocumentIndexAtom);
    const content = docs[idx]?.content;
    return countWords(content);
  }

  const singleEditorContent = get(editorContentAtom);
  return countWords(singleEditorContent);
});

// Hook to use word count
export const useWordCount = () => {
  const wordCount = useAtomValue(wordCountAtom);
  return { wordCount };
};

export const countWords = (text: string): number => {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Use Intl.Segmenter if available
  // Note: It may over-segment Japanese text, but it's still better than nothing
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      // Detect if text contains Japanese characters
      const hasJapanese = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(text);

      // Use appropriate locale: 'ja' for Japanese content, 'en' for others
      const locale = hasJapanese ? "ja" : "en";
      const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
      const segments = segmenter.segment(text);

      let wordCount = 0;
      for (const segment of segments) {
        if (segment.isWordLike) {
          wordCount++;
        }
      }
      return wordCount;
    } catch (_e) {
      // Fall through to regex approach
    }
  }

  // Fallback: Count English words and Japanese character groups
  const englishWords = text.match(/\b[a-zA-Z0-9]+\b/g) || [];
  const japaneseGroups = text.match(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+/g) || [];

  return englishWords.length + japaneseGroups.length;
};
