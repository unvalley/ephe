import type { EditorView } from "@codemirror/view";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { useLayoutEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";

const INITIAL_CURSOR_POSITION = { from: 0, to: 0 };
const cursorAtom = atomWithStorage<{ from: number; to: number }>(
  LOCAL_STORAGE_KEYS.CURSOR_POSITION,
  INITIAL_CURSOR_POSITION,
);

export const useCursorPosition = (view?: EditorView) => {
  const [cursorPosition, setCursorPosition] = useAtom(cursorAtom);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || !view) return;

    if (cursorPosition.from || cursorPosition.to) {
      const len = view.state.doc.length;
      view.dispatch({
        selection: {
          anchor: Math.min(cursorPosition.from, len),
          head: Math.min(cursorPosition.to, len),
        },
        scrollIntoView: true,
      });
    }

    const save = () => {
      const { from, to } = view.state.selection.main;
      setCursorPosition((prev) => (prev.from === from && prev.to === to ? prev : { from, to }));
    };

    // only save cursor position when the page is hidden
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [view, cursorPosition, setCursorPosition]);

  const resetCursorPosition = () => setCursorPosition(INITIAL_CURSOR_POSITION);

  return { cursorPosition, resetCursorPosition };
};
