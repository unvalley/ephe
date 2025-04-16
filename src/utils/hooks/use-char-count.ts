import { useAtom } from "jotai";
import { atom } from "jotai";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { useEffect } from "react";

export const charCountAtom = atom<number>(0);

export const useCharCount = () => {
  const [charCount, setCharCount] = useAtom(charCountAtom);

  // Initialize character count from editor content if not already set
  useEffect(() => {
    if (charCount === 0) {
      const editorContent = localStorage.getItem(LOCAL_STORAGE_KEYS.EDITOR_CONTENT);
      const DOUBLE_QUOTE_SIZE = 2;
      if (editorContent == null) {
        setCharCount(0);
      } else {
        setCharCount(editorContent.length - DOUBLE_QUOTE_SIZE);
      }
    }
  }, [charCount, setCharCount]);

  return { charCount, setCharCount };
};
