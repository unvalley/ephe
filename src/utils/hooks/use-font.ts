"use client";

import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "../constants";

export const FONT_FAMILIES = {
  IA_WRITER_MONO: {
    value: "'iA Writer Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
    displayValue: "iA Writer Mono",
  },
  MONOSPACE: {
    value: "'monospace', 'Menlo', 'Monaco', 'Courier New'",
    displayValue: "Monospace",
  },
  IBM_PLEX_MONO: {
    value: "'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
    displayValue: "IBM Plex Mono",
  },
  MYNERVE: {
    value: "'Mynerve', cursive",
    displayValue: "Mynerve",
    googleFontUrl: "https://fonts.googleapis.com/css2?family=Mynerve&display=swap",
  },
} as const;

export type FontFamily = keyof typeof FONT_FAMILIES;
export const FONT_FAMILY_OPTIONS = Object.keys(FONT_FAMILIES) as (keyof typeof FONT_FAMILIES)[];

const fontFamilyAtom = atomWithStorage<FontFamily>(LOCAL_STORAGE_KEYS.FONT_FAMILY, "IA_WRITER_MONO");

const loadGoogleFont = (url: string) => {
  const existingLink = document.querySelector(`link[href="${url}"]`);
  if (!existingLink) {
    const link = document.createElement("link");
    link.href = url;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
};

export const useFontFamily = () => {
  const [fontFamily, setFontFamily] = useAtom(fontFamilyAtom);

  useEffect(() => {
    const fontConfig = FONT_FAMILIES[fontFamily];
    if ("googleFontUrl" in fontConfig) {
      loadGoogleFont(fontConfig.googleFontUrl);
    }
  }, [fontFamily]);

  const getFontValue = (family: FontFamily) => FONT_FAMILIES[family].value;
  const getFontDisplayValue = (family: FontFamily) => FONT_FAMILIES[family].displayValue;
  const currentFontValue = getFontValue(fontFamily);
  const currentFontDisplayValue = getFontDisplayValue(fontFamily);

  return {
    fontFamily,
    setFontFamily,
    currentFontValue,
    currentFontDisplayValue,
    getFontValue,
    getFontDisplayValue,
  };
};
