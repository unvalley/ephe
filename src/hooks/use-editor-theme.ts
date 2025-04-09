import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { useEffect } from "react";

const EDITOR_THEME_STORAGE_KEY = "editor-theme";

// デフォルトテーマを決定する関数
const getDefaultTheme = (): string => {
  // システムのダークモード設定を確認
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "man-city-dark" : "man-city-light";
};

// Jotai atomを作成
const editorThemeAtom = atomWithStorage<string>(
  EDITOR_THEME_STORAGE_KEY,
  typeof window !== "undefined" ? getDefaultTheme() : "man-city-light" // SSRの場合のフォールバック
);

export const useEditorTheme = () => {
  const [theme, setTheme] = useAtom(editorThemeAtom);

  // テーマが変更されたらイベントを発行
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("editor-theme-changed", { detail: { theme } }));
  }, [theme]);

  // テーマリスト
  const themes = [
    { id: "ephe-light", name: "Ephe Light", description: "Custom light theme for Ephe" },
    { id: "ephe-dark", name: "Ephe Dark", description: "Custom dark theme for Ephe" },
    { id: "man-city-light", name: "Man City Light", description: "Manchester City light theme" },
    { id: "man-city-dark", name: "Man City Dark", description: "Manchester City dark theme" },
  ] as const;

  return {
    theme,
    setTheme,
    themes,
  };
}; 