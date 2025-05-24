import { LOCAL_STORAGE_KEYS } from "../constants";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";

export type PaperMode = "normal" | "graph" | "dots";

const PAPER_MODE_CLASSES = {
  normal: "bg-normal-paper",
  graph: "bg-graph-paper",
  dots: "bg-dots-paper",
} as const;

const paperModeAtom = atomWithStorage<PaperMode>(LOCAL_STORAGE_KEYS.PAPER_MODE, "normal");

export const usePaperMode = () => {
  const [paperMode, setPaperMode] = useAtom(paperModeAtom);

  const cyclePaperMode = () => {
    const modes = ["normal", "graph", "dots"] as const;
    const currentIndex = modes.indexOf(paperMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setPaperMode(modes[nextIndex]);
    return modes[nextIndex];
  };

  const toggleNormalMode = () => {
    setPaperMode((prev) => (prev === "normal" ? "normal" : "normal"));
  };

  const toggleGraphMode = () => {
    setPaperMode((prev) => (prev === "graph" ? "normal" : "graph"));
  };

  const toggleDotsMode = () => {
    setPaperMode((prev) => (prev === "dots" ? "normal" : "dots"));
  };

  return {
    paperMode,
    paperModeClass: PAPER_MODE_CLASSES[paperMode],
    cyclePaperMode,
    toggleNormalMode,
    toggleGraphMode,
    toggleDotsMode,
  };
};
