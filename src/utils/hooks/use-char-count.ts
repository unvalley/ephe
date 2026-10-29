import { atom, useAtomValue } from "jotai";
import { activeContentAtom } from "../atoms/active-content";

const charCountAtom = atom((get) => get(activeContentAtom).length);

export const useCharCount = () => {
  const charCount = useAtomValue(charCountAtom);
  return { charCount };
};
