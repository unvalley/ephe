import { useAtom, useAtomValue } from "jotai";
import { atom } from "jotai";
import { useEffect } from "react";
import { editorStatsContentAtom } from "../atoms/editor";

export const charCountAtom = atom<number>(0);

export const useCharCount = () => {
  const [charCount, setCharCount] = useAtom(charCountAtom);
  const statsContent = useAtomValue(editorStatsContentAtom);

  // Keep character count in sync with current editor content.
  useEffect(() => {
    const nextCount = statsContent.length;
    if (charCount !== nextCount) {
      setCharCount(nextCount);
    }
  }, [charCount, setCharCount, statsContent]);

  return { charCount, setCharCount };
};
