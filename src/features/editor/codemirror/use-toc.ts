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

  // 1. コンテンツから目次アイテムを解析する関数 (from を計算)
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

  // 2. コンテンツ変更時に目次アイテムを再生成するEffect (変更なし)
  useEffect(() => {
    const newItems = parseTocItems(content);
    setTocItems(newItems);
  }, [content, parseTocItems]);

  // 3. 目次項目クリック時にエディタの該当箇所にフォーカスする関数 (CodeMirror APIを使用)
  const focusOnSection = useCallback(
    (from: number) => {
      if (!editorView) return;

      const transaction = editorView.state.update({
        // カーソルを見出し行の先頭に移動
        selection: { anchor: from },
        // 指定した位置がビューポートの中央に来るようにスクロール
        effects: EditorView.scrollIntoView(from, { y: "center" }),
        // 必要であればユーザーイベントの種類を指定
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
