import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { LOCAL_STORAGE_KEYS } from "../constants";

export const CURSOR_COLORS = {
  ink: {
    label: "Ink",
    valueLight: "#262626",
    valueDark: "#D4D4D4",
    selectionLight: "rgba(38, 38, 38, 0.16)",
    selectionDark: "rgba(212, 212, 212, 0.22)",
  },
  cyan: {
    label: "Cyan",
    valueLight: "#00C1FA",
    valueDark: "#00C1FA",
    selectionLight: "rgba(0, 52, 73, 0.24)",
    selectionDark: "rgba(0, 52, 73, 1)",
  },
} as const;

export type CursorColor = keyof typeof CURSOR_COLORS;

export const CURSOR_COLOR_OPTIONS = ["ink", "cyan"] satisfies CursorColor[];

type StoredCursorColor = CursorColor | "gray" | "amber";

export const cursorColorAtom = atomWithStorage<StoredCursorColor>(LOCAL_STORAGE_KEYS.CURSOR_COLOR, "ink");

export const resolveCursorColor = (cursorColor: StoredCursorColor): CursorColor => {
  if (cursorColor === "cyan") return "cyan";
  return "ink";
};

export const getCursorColor = (cursorColor: StoredCursorColor) => CURSOR_COLORS[resolveCursorColor(cursorColor)];

export const useCursorColor = () => {
  const [cursorColor, setCursorColor] = useAtom(cursorColorAtom);
  const resolvedCursorColor = resolveCursorColor(cursorColor);

  return {
    cursorColor: resolvedCursorColor,
    setCursorColor,
  };
};
