"use client";

import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ValueOf } from "../utils/types";
import { useEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "../utils/constants";

const COLOR_THEME = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;

type ColorTheme = ValueOf<typeof COLOR_THEME>;

const themeAtom = atomWithStorage<ColorTheme>(LOCAL_STORAGE_KEYS.THEME, "system");

export const useTheme = () => {
  const [theme, setTheme] = useAtom(themeAtom);

  useEffect(() => {
    if (theme === COLOR_THEME.SYSTEM) {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      }
    } else if (theme === COLOR_THEME.DARK) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);
  
  const nextTheme = theme === COLOR_THEME.LIGHT ? COLOR_THEME.DARK : COLOR_THEME.LIGHT;
  return { theme, nextTheme, setTheme, isDarkMode: theme === COLOR_THEME.DARK };
};
