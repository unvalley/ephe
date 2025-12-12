"use client";

import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect, useSyncExternalStore } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";
import { COLOR_THEME, type ColorTheme, applyTheme } from "../theme-initializer";

const themeAtom = atomWithStorage<ColorTheme>(LOCAL_STORAGE_KEYS.THEME, COLOR_THEME.SYSTEM);

const getMediaQuery = () => window.matchMedia("(prefers-color-scheme: dark)");
const getSystemPrefersDark = () => getMediaQuery().matches;

const subscribeToSystemTheme = (callback: () => void) => {
  const mediaQuery = getMediaQuery();
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
};

export const useTheme = () => {
  const [theme, setTheme] = useAtom(themeAtom);
  const systemPrefersDark = useSyncExternalStore(subscribeToSystemTheme, getSystemPrefersDark, () => false);

  const isDarkMode = theme === COLOR_THEME.DARK || (theme === COLOR_THEME.SYSTEM && systemPrefersDark);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, systemPrefersDark]);

  // Light -> Dark -> System
  const nextTheme =
    theme === COLOR_THEME.SYSTEM
      ? COLOR_THEME.LIGHT
      : theme === COLOR_THEME.LIGHT
        ? COLOR_THEME.DARK
        : COLOR_THEME.SYSTEM;

  const cycleTheme = () => {
    setTheme(nextTheme);
  };

  return { theme, nextTheme, setTheme, isDarkMode, cycleTheme };
};
