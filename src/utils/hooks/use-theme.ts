"use client";

import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { COLOR_THEME, type ColorTheme, applyTheme } from "../theme-initializer";

// Create a storage implementation with proper subscribe method for cross-tab sync
const themeJSONStorage = createJSONStorage<ColorTheme>(() => localStorage, {
  // Add optional reviver/replacer if needed
});

const themeAtom = atomWithStorage<ColorTheme>(
  LOCAL_STORAGE_KEYS.THEME, 
  COLOR_THEME.SYSTEM,
  themeJSONStorage,
  { getOnInit: true }
);

export const useTheme = () => {
  const [theme, setTheme] = useAtom(themeAtom);

  // Apply theme changes when theme state changes
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
