import type { EditorView } from "@codemirror/view";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { useLayoutEffect, useMemo } from "react";
import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";

const INITIAL_CURSOR_POSITION = { from: 0, to: 0 };
export const useCursorPosition = (view?: EditorView, storageKey?: string) => {
  const key = storageKey ?? LOCAL_STORAGE_KEYS.CURSOR_POSITION;
  const cursorAtom = useMemo(
    () => atomWithStorage<{ from: number; to: number }>(key, INITIAL_CURSOR_POSITION),
    [key],
  );
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        save();
      }
    };

    // Save cursor position on page lifecycle events
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [view, cursorPosition, setCursorPosition]);

  const resetCursorPosition = () => setCursorPosition(INITIAL_CURSOR_POSITION);

  return { cursorPosition, resetCursorPosition };
};
