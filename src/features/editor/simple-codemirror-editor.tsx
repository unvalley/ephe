import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap, ViewUpdate } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";

export type SimpleEditorProps = {
  initialValue?: string;
  onChange?: (value: string) => void;
  width?: string;
  height?: string;
  className?: string;
  isDarkMode?: boolean;
  placeholder?: string;
};

export function SimpleCodeMirrorEditor({
  initialValue = "",
  onChange,
  width = "100%",
  height = "100%",
  className = "",
  isDarkMode = false,
  placeholder = "",
}: SimpleEditorProps) {
  // EditorViewを保持するための参照
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  // スタイルの定義
  const editorTheme = useMemo(() => {
    return EditorView.theme({
      "&": {
        height,
        width,
      },
      ".cm-content": {
        fontFamily: "'Menlo', monospace",
        fontSize: "14px",
        lineHeight: "1.8",
      },
      ".cm-line": {
        padding: "0 4px",
        lineHeight: "1.6",
        fontKerning: "normal",
      },
      ".cm-gutters": {
        backgroundColor: isDarkMode ? "#282c34" : "#f5f5f5",
        color: isDarkMode ? "#ddd" : "#333",
        border: "none",
      },
      // 選択範囲の背景色
      ".cm-selectionBackground": {
        backgroundColor: isDarkMode ? "#ffffff30" : "#6699ff30 !important",
      },
      // エディタの外枠
      "&.cm-editor": {
        outline: "none", // エディターの枠線を非表示
      },
      // カーソル
      "&.cm-editor .cm-cursor": {
        borderLeftColor: isDarkMode ? "#fff" : "#000",
      },
      // 行のハイライト
      "&.cm-editor .cm-activeLine": {
        backgroundColor: isDarkMode ? "#ffffff0f" : "#0000000f",
      },
    });
  }, [height, width, isDarkMode]);

  // エディタの更新処理
  const handleDocChange = useCallback(
    (update: ViewUpdate) => {
      if (update.docChanged && onChange) {
        const doc = update.state.doc;
        const value = doc.toString();
        onChange(value);
      }
    },
    [onChange],
  );

  // 拡張機能の定義
  const extensions = useMemo(() => {
    const exts: Extension[] = [
      // 基本設定
      history(),
      // キーマップ
      keymap.of(defaultKeymap),
      keymap.of(historyKeymap),
      keymap.of([indentWithTab]),
      // Markdown言語サポート
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      // 表示設定
      EditorView.lineWrapping,
      editorTheme,
      // 変更検知
      EditorView.updateListener.of(handleDocChange),
    ];

    if (isDarkMode) {
      exts.push(oneDark);
    }

    return exts;
  }, [editorTheme, handleDocChange, isDarkMode]);

  // エディタの初期化
  useEffect(() => {
    if (!editorRef.current) return;

    // すでに存在する場合は破棄
    if (editorView) {
      editorView.destroy();
    }

    // 初期状態の作成
    const state = EditorState.create({
      doc: initialValue,
      extensions,
    });

    // ビューの作成
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    setEditorView(view);

    return () => {
      view.destroy();
    };
  }, [extensions, initialValue]);

  // 外部からの値の変更を処理
  useEffect(() => {
    if (!editorView) return;

    const currentValue = editorView.state.doc.toString();
    if (initialValue !== currentValue) {
      // 現在の選択状態を保存
      const selection = editorView.state.selection;

      // トランザクションで値を更新
      editorView.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: initialValue,
        },
        selection,
      });
    }
  }, [initialValue, editorView]);

  return (
    <div className={className} style={{ height, width }}>
      <div ref={editorRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
