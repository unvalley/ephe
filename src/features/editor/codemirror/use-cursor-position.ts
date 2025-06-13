import type { EditorView } from "@codemirror/view";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useCallback, useEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";

const cursorStorage = createJSONStorage<{ from: number; to: number }>(() => localStorage);

const cursorPositionAtom = atomWithStorage<{ from: number; to: number }>(
  LOCAL_STORAGE_KEYS.CURSOR_POSITION,
  { from: 0, to: 0 },
  cursorStorage
);

export const useCursorPosition = (view: EditorView | undefined) => {
  const [cursorPosition, setCursorPosition] = useAtom(cursorPositionAtom);

  // Save cursor position whenever selection changes
  const saveCursorPosition = useCallback(
    (from: number, to: number) => {
      setCursorPosition({ from, to });
    },
    [setCursorPosition]
  );

  // Restore cursor position to the editor
  const restoreCursorPosition = useCallback(() => {
    if (!view) return;

    const docLength = view.state.doc.length;
    if (cursorPosition.from !== 0 || cursorPosition.to !== 0) {
      // Ensure cursor position is within document bounds
      const safeFrom = Math.min(cursorPosition.from, docLength);
      const safeTo = Math.min(cursorPosition.to, docLength);

      view.dispatch({
        selection: { anchor: safeFrom, head: safeTo },
        scrollIntoView: true,
      });
    }
  }, [view, cursorPosition]);

  // Reset cursor position (useful when content is replaced)
  const resetCursorPosition = useCallback(() => {
    setCursorPosition({ from: 0, to: 0 });
  }, [setCursorPosition]);

  // Auto-restore cursor position when view is ready
  useEffect(() => {
    if (view) {
      // Small delay to ensure editor is fully initialized
      const timer = setTimeout(() => {
        restoreCursorPosition();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [view]); // Only run when view becomes available

  return {
    cursorPosition,
    saveCursorPosition,
    restoreCursorPosition,
    resetCursorPosition,
  };
};