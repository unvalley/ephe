"use client";

import { useState, useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { Link } from "react-router-dom";
import { useTheme } from "../../utils/hooks/use-theme";
import { Footer } from "../../utils/components/footer";

export function JapaneseEditor() {
  const [content, setContent] = useState<string>("");
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { isDarkMode } = useTheme();

  // 初期化時のみ実行するエディタセットアップ
  useEffect(() => {
    if (!editorRef.current) return;
    
    // 既存のエディタがあれば破棄
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    // シンプルなエディタを作成
    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [
          // 最小限の拡張機能
          history(),
          keymap.of(defaultKeymap),
          markdown(),
          EditorView.lineWrapping,
          
          // 変更検知
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              setContent(update.state.doc.toString());
            }
          }),
          
          // シンプルなスタイル
          EditorView.theme({
            "&": {
              height: "100%",
              width: "100%",
              background: "transparent",
              color: isDarkMode ? "#e0e0e0" : "#333333",
            },
            ".cm-content": {
              fontFamily: "sans-serif",
              fontSize: "16px",
              padding: "10px 20px",
              lineHeight: "1.6",
              maxWidth: "680px",
              margin: "0 auto", // 中央寄せ
              background: "transparent",
            },
            ".cm-cursor": {
              borderLeftColor: isDarkMode ? "#ffffff" : "#000000",
              borderLeftWidth: "2px",
            },
            "&.cm-editor": {
              outline: "none", 
              border: "none",
              background: "transparent",
            },
            "&.cm-focused": {
              outline: "none", 
            },
            ".cm-scroller": {
              fontFamily: "sans-serif",
              background: "transparent",
            },
            ".cm-gutters": {
              background: "transparent",
              border: "none",
            },
            ".cm-activeLineGutter": {
              background: "transparent",
            },
          }),
        ],
      }),
      parent: editorRef.current
    });

    viewRef.current = view;
    
    // フォーカスを当てる
    setTimeout(() => view.focus(), 100);

    return () => {
      view.destroy();
    };
  }, [isDarkMode]);  // isDarkModeのみに依存

  // レイアウト全体をシンプルにして確実に動作させる
  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 dark:border-gray-800 flex justify-between items-center max-w-[800px] mx-auto w-full p-3">
        <h1 className="text-lg font-normal m-0">日本語テキストエディタ</h1>
        <Link 
          to="/" 
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
        >
          戻る
        </Link>
      </div>

      {/* エディタコンテナ - h-fullを使用して親要素の高さを継承 */}
      <div className="flex-1 overflow-hidden max-w-[800px] mx-auto w-full">
        {/* エディタ本体 */}
        <div ref={editorRef} className="h-full w-full" />
      </div>

      {/* 文字数カウンター */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-right max-w-[800px] mx-auto w-full p-2 border-t border-gray-200 dark:border-gray-800">
        {content.length} 文字
      </div>
    </div>
  );
} 