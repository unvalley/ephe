import { useState, useCallback, useEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";

export type EditorType = "monaco" | "codemirror" | "simple-codemirror";

export function useEditorType() {
  // ローカルストレージから初期値を取得
  const [editorType, setEditorType] = useState<EditorType>(() => {
    const storedType = localStorage.getItem(LOCAL_STORAGE_KEYS.EDITOR_TYPE);
    // 有効な値かチェック
    if (storedType === "monaco" || storedType === "codemirror" || storedType === "simple-codemirror") {
      return storedType as EditorType;
    }
    return "monaco"; // デフォルト値
  });

  // エディタタイプが変更されたらローカルストレージを更新
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.EDITOR_TYPE, editorType);
  }, [editorType]);

  // 次のエディタタイプに切り替える
  const toggleEditorType = useCallback(() => {
    setEditorType((current) => {
      // ローテーションでタイプを切り替え
      if (current === "monaco") return "codemirror";
      if (current === "codemirror") return "simple-codemirror";
      return "monaco";
    });
  }, []);

  // 便利なフラグを返す
  return {
    editorType,
    isMonaco: editorType === "monaco",
    isCodeMirror: editorType === "codemirror" || editorType === "simple-codemirror",
    isSimpleCodeMirror: editorType === "simple-codemirror",
    toggleEditorType,
  };
}
