"use client";

import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { COLOR_THEME, type ColorTheme, applyTheme } from "../theme-initializer";

const themeAtom = atomWithStorage<ColorTheme>(LOCAL_STORAGE_KEYS.THEME, COLOR_THEME.SYSTEM);

export const useTheme = () => {
  const [theme, setTheme] = useAtom(themeAtom);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => {
      if (theme === COLOR_THEME.SYSTEM) {
        applyTheme(theme);
      }
    };
    mediaQuery.addEventListener("change", handleThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, [theme]);

  const nextTheme = theme === COLOR_THEME.LIGHT ? COLOR_THEME.DARK : COLOR_THEME.LIGHT;
  const isDarkMode =
    theme === COLOR_THEME.DARK ||
    (theme === COLOR_THEME.SYSTEM && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return { theme, nextTheme, setTheme, isDarkMode };
};
