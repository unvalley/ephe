"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ColorTheme = "light" | "dark";

type ThemeContextType = {
  theme: ColorTheme;
  toggleTheme: () => void;
  toggleTargetTheme: ColorTheme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ColorTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = sessionStorage.getItem("theme") as ColorTheme | undefined;

    if (!storedTheme) {
      setTheme("light");
    } else {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Apply theme to document
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    sessionStorage.setItem("theme", newTheme);
  };

  const toggleTargetTheme = theme === "light" ? "dark" : "light";

  return <ThemeContext.Provider value={{ theme, toggleTheme, toggleTargetTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  // biome-ignore lint/suspicious/noDoubleEquals: undefined check
  if (context == undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
