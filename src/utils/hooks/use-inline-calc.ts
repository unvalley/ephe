import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { useAtom } from "jotai";

export type InlineCalcMode = "off" | "on";

export const inlineCalcAtom = atomWithStorage<InlineCalcMode>(LOCAL_STORAGE_KEYS.INLINE_CALC, "on");

export const useInlineCalc = () => {
  const [inlineCalcMode, setInlineCalcMode] = useAtom(inlineCalcAtom);

  const toggleInlineCalc = () => {
    const next: InlineCalcMode = inlineCalcMode === "on" ? "off" : "on";
    setInlineCalcMode(next);
    return next;
  };

  return {
    inlineCalcMode,
    isInlineCalcEnabled: inlineCalcMode === "on",
    setInlineCalcMode,
    toggleInlineCalc,
  };
};
