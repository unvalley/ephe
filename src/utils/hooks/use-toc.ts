// hooks/useTableOfContents.ts
import { useState, useEffect, useCallback, type RefObject } from "react";
// import type { editor } from "monaco-editor";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { LOCAL_STORAGE_KEYS } from "../constants"; // 定数ファイルのパスを確認してください

// --- 型定義 ---
export type TocItem = {
  level: number;
  text: string;
  line: number; // 元のコンテンツにおける行番号
};

type UseTableOfContentsProps = {
  editorRef: RefObject<HTMLDivElement | null>;
  content: string; // 目次生成のためにコンテンツ文字列も必要
};

// --- 定数 ---
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

// --- Jotai Atom ---
// TOCの表示状態をlocalStorageに永続化
const tocVisibilityAtom = atomWithStorage<boolean>(LOCAL_STORAGE_KEYS.TOC_MODE, false);

/**
 * 目次のデータ生成、表示状態管理、エディタ連携を統合したカスタムフック
 * @param props - エディタリファレンスとMarkdownコンテンツ
 * @returns 目次アイテム、表示状態、トグル関数、フォーカス関数
 */
export const useTableOfContents = ({ editorRef, content }: UseTableOfContentsProps) => {
  // --- 状態管理 ---
  // 1. 目次アイテムの状態 (コンテンツから生成)
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  // 2. 目次表示状態 (Jotai + localStorage)
  const [isVisibleToc, setIsVisibleToc] = useAtom(tocVisibilityAtom);

  // --- ロジック ---
  // 1. コンテンツから目次アイテムを解析する関数
  const parseTocItems = useCallback((text: string): TocItem[] => {
    if (!text) return [];
    const lines = text.split("\n");
    const items: TocItem[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = HEADING_REGEX.exec(line);
      if (match) {
        items.push({
          level: match[1].length,
          text: match[2].trim(),
          line: i,
        });
      }
    }
    return items;
  }, []); // 依存なし

  // 2. コンテンツ変更時に目次アイテムを再生成するEffect
  useEffect(() => {
    const newItems = parseTocItems(content);
    setTocItems(newItems);
  }, [content, parseTocItems]);

  // 3. 目次項目クリック時にエディタの該当箇所にフォーカスする関数
  const focusOnSection = useCallback(
    (line: number) => {
      const editorInstance = editorRef?.current;
      if (!editorInstance) return;

      const targetLine = line + 1; // Monaco Editorの行番号は1始まり
      // 対象行が中央に来るようにスクロール
      editorInstance.revealLineInCenter(targetLine);
      // カーソルを対象行の先頭に移動
      editorInstance.setPosition({ lineNumber: targetLine, column: 1 });
      // エディタにフォーカスを当てる
      editorInstance.focus();
    },
    [editorRef], // editorRefが変わることは稀だが、依存関係として明記
  );

  // 4. 目次の表示/非表示を切り替える関数
  const toggleToc = useCallback(() => {
    setIsVisibleToc((prev) => !prev);
  }, [setIsVisibleToc]); // setIsVisibleTocは通常不変だが、依存関係として明記

  // --- 返り値 ---
  return {
    tocItems, // 生成された目次アイテムの配列
    isVisibleToc, // 現在の表示状態 (true/false)
    toggleToc, // 表示状態を切り替える関数
    focusOnSection, // 特定の行にフォーカスする関数
  };
};

// import { useCallback } from "react";
// import type { RefObject } from "react";
// import type { editor } from "monaco-editor";
// import { LOCAL_STORAGE_KEYS } from "../constants";
// import { atomWithStorage } from "jotai/utils";
// import { useAtom } from "jotai";

// type UseTocProps = {
//   editorRef: RefObject<editor.IStandaloneCodeEditor | null>;
// };

// const tocAtom = atomWithStorage<boolean>(LOCAL_STORAGE_KEYS.TOC_MODE, false);

// export const useToc = (props?: UseTocProps) => {
//   const [isVisibleToc, setIsVisibleToc] = useAtom(tocAtom);

//   const focusOnSection = useCallback(
//     (line: number) => {
//       if (!props?.editorRef?.current) return;
//       // Position to the start of the clicked heading line
//       props.editorRef.current.revealLineInCenter(line + 1);
//       props.editorRef.current.setPosition({ lineNumber: line + 1, column: 1 });
//       props.editorRef.current.focus();
//     },
//     [props?.editorRef],
//   );

//   const toggleToc = useCallback(() => {
//     setIsVisibleToc((prev) => !prev);
//   }, [setIsVisibleToc]);

//   return {
//     isVisibleToc,
//     toggleToc,
//     focusOnSection,
//   };
// };
