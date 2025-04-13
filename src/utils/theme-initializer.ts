import { LOCAL_STORAGE_KEYS } from "./constants";

export const COLOR_THEME = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;

export type ColorTheme = (typeof COLOR_THEME)[keyof typeof COLOR_THEME];

// Apply theme to document based on current settings
export const applyTheme = (theme: ColorTheme): void => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (theme === COLOR_THEME.SYSTEM && prefersDark) {
    document.documentElement.classList.add("dark");
  } else if (theme === COLOR_THEME.DARK) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

// This script runs immediately to set theme before CSS loads
const initializeTheme = (): void => {
  const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
  const theme = storedTheme ? (JSON.parse(storedTheme) as ColorTheme) : COLOR_THEME.SYSTEM;
  applyTheme(theme);
};

// Initialize on script load
initializeTheme();
