import type { TransactionSpec } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { DprintMarkdownFormatter } from "./dprint-markdown-formatter";

export const useMarkdownFormatter = () => {
  const ref = useRef<DprintMarkdownFormatter | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const fmt = await DprintMarkdownFormatter.getInstance();
      if (alive) {
        ref.current = fmt;
      }
    })();
    return () => {
      alive = false;
      ref.current = null;
    };
  }, []);
  return ref;
};

/**
 * Formats the whole document in place, keeping the cursor's line/column and the scroll position.
 * Returns the formatted text, or null when formatting changed nothing.
 */
export const formatEditorView = async (
  view: EditorView,
  formatter: DprintMarkdownFormatter,
  annotations?: TransactionSpec["annotations"],
): Promise<string | null> => {
  const { state } = view;
  const scrollTop = view.scrollDOM.scrollTop;
  const cursorPos = state.selection.main.head;
  const cursorLine = state.doc.lineAt(cursorPos);
  const cursorLineNumber = cursorLine.number;
  const cursorColumn = cursorPos - cursorLine.from;
  const currentText = state.doc.toString();
  const formattedText = await formatter.formatMarkdown(currentText);
  if (formattedText === currentText) return null;

  view.dispatch({
    changes: { from: 0, to: state.doc.length, insert: formattedText },
    annotations,
  });

  // Restore cursor position after formatting
  try {
    const newState = view.state;
    if (cursorLineNumber <= newState.doc.lines) {
      const newLine = newState.doc.line(cursorLineNumber);
      const newPos = newLine.from + Math.min(cursorColumn, newLine.length);
      view.dispatch({ selection: { anchor: newPos, head: newPos } });
    }
  } catch (_selectionError) {
    view.dispatch({ selection: { anchor: 0, head: 0 } });
  }
  view.scrollDOM.scrollTop = Math.min(scrollTop, view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight);
  return formattedText;
};
