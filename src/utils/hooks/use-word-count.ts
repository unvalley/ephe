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

const JAPANESE_CHAR_RE = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;

// Cache one Intl.Segmenter per locale. Constructing one allocates dozens of
// objects, so reusing across calls matters for typing-rate hot paths.
const segmenterCache = new Map<string, Intl.Segmenter | null>();
const getSegmenter = (locale: "ja" | "en"): Intl.Segmenter | null => {
  if (typeof Intl === "undefined" || !("Segmenter" in Intl)) return null;
  const cached = segmenterCache.get(locale);
  if (cached !== undefined) return cached;
  try {
    const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
    segmenterCache.set(locale, segmenter);
    return segmenter;
  } catch {
    segmenterCache.set(locale, null);
    return null;
  }
};

export const countWords = (text: string): number => {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Use Intl.Segmenter if available. It may over-segment Japanese, but is still
  // better than the regex fallback.
  const locale = JAPANESE_CHAR_RE.test(text) ? "ja" : "en";
  const segmenter = getSegmenter(locale);
  if (segmenter) {
    let wordCount = 0;
    for (const segment of segmenter.segment(text)) {
      if (segment.isWordLike) {
        wordCount++;
      }
    }
    return wordCount;
  }

  // Fallback: count English words and Japanese character groups separately.
  const englishWords = text.match(/\b[a-zA-Z0-9]+\b/g) || [];
  const japaneseGroups = text.match(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+/g) || [];

  return englishWords.length + japaneseGroups.length;
};
