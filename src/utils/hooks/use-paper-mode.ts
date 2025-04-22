import { LOCAL_STORAGE_KEYS } from "../constants";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";

export type PaperMode = "normal" | "graph" | "dots";

export const PAPER_MODE_CLASSES = {
  normal: "",
  graph: "bg-graph-paper",
  dots: "bg-dots-paper",
} as const;

const paperModeAtom = atomWithStorage<PaperMode>(LOCAL_STORAGE_KEYS.PAPER_MODE, "normal");

export const usePaperMode = () => {
  const [paperMode, setPaperMode] = useAtom(paperModeAtom);

  const cycleMode = () => {
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
    cycleMode,
    toggleNormalMode,
    toggleGraphMode,
    toggleDotsMode,
  };
};
