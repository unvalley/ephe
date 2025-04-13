"use client";

import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { ValueOf } from "../utils/types";
import { useEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "../utils/constants";

const COLOR_THEME = {
  LIGHT: "light",
  DARK: "dark",
} as const;

type ColorTheme = ValueOf<typeof COLOR_THEME>;

const themeAtom = atomWithStorage<ColorTheme>(LOCAL_STORAGE_KEYS.THEME, "light");

export const useTheme = () => {
  const [theme, setTheme] = useAtom(themeAtom);

  useEffect(() => {
    if (theme === COLOR_THEME.DARK) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const nextTheme = theme === COLOR_THEME.LIGHT ? COLOR_THEME.DARK : COLOR_THEME.LIGHT;
  return { theme, nextTheme, setTheme, isDarkMode: theme === COLOR_THEME.DARK };
};
