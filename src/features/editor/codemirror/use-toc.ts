import { useState, useEffect, useCallback } from "react";
import { EditorView } from "@codemirror/view";

export type TocItem = {
  level: number;
  text: string;
  from: number;
};

type UseTableOfContentsProps = {
  editorView: EditorView;
  content: string;
};

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

export const useTableOfContentsCodeMirror = ({ editorView, content }: UseTableOfContentsProps) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  // 1. Parse table of contents items from content (calculate from position)
  const parseTocItems = useCallback((text: string): TocItem[] => {
    if (!text) return [];
    const lines = text.split("\n");
    const items: TocItem[] = [];
    let currentPos = 0;

    for (const lineText of lines) {
      const match = HEADING_REGEX.exec(lineText);
      if (match) {
        items.push({
          level: match[1].length,
          text: match[2].trim(),
          from: currentPos,
        });
      }
      currentPos += lineText.length + 1;
    }
    return items;
  }, []);

  // 2. Effect to regenerate table of contents items when content changes
  useEffect(() => {
    const newItems = parseTocItems(content);
    setTocItems(newItems);
  }, [content, parseTocItems]);

  // 3. Function to focus on section when table of contents item is clicked (using CodeMirror API)
  const focusOnSection = useCallback(
    (from: number) => {
      if (!editorView) return;

      const transaction = editorView.state.update({
        // Move cursor to the beginning of the heading line
        selection: { anchor: from },
        // Scroll so the specified position is centered in the viewport
        effects: EditorView.scrollIntoView(from, { y: "center" }),
        // Specify user event type if needed
        // userEvent: "select.toc"
      });

      editorView.dispatch(transaction);
      editorView.focus();
    },
    [editorView],
  );

  return {
    tocItems,
    focusOnSection,
  };
};
