import { LOCAL_STORAGE_KEYS } from "../constants";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";

export type PaperMode = "normal" | "graph" | "dots";

/**
 * The colour of the sheet. Its grid or dots are painted by the editor itself
 * (see `paper-background.ts`), which is the only place that knows where the
 * text sits, so a mode does not get a class of its own here.
 */
export const PAPER_SURFACE_CLASS = "bg-paper";

const modes = ["normal", "graph", "dots"] as const;
const paperModeAtom = atomWithStorage<PaperMode>(LOCAL_STORAGE_KEYS.PAPER_MODE, "normal");

export const usePaperMode = () => {
  const [paperMode, setPaperMode] = useAtom(paperModeAtom);

  const cyclePaperMode = () => {
    const currentIndex = modes.indexOf(paperMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setPaperMode(modes[nextIndex]);
    return modes[nextIndex];
  };

  return {
    paperMode,
    cyclePaperMode,
    setPaperMode,
  };
};
