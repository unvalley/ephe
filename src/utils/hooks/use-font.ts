"use client";

import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../constants";

export const FONT_FAMILIES = {
  MONOSPACE: {
    value: "'monospace', 'Menlo', 'Monaco', 'Courier New'",
    displayValue: "Monospace",
  },
  IA_WRITER_QUATTRO: {
    value: "'iA Writer Quattro', 'IBM Plex Serif', 'Source Serif 4', serif",
    displayValue: "iA Writer Quattro",
  },
  IBM_PLEX_MONO: {
    value: "'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
    displayValue: "IBM Plex Mono",
  },
} as const;

export type FontFamily = keyof typeof FONT_FAMILIES;
export const FONT_FAMILY_OPTIONS = Object.keys(FONT_FAMILIES) as (keyof typeof FONT_FAMILIES)[];

const fontFamilyAtom = atomWithStorage<FontFamily>(LOCAL_STORAGE_KEYS.FONT_FAMILY, "MONOSPACE");

export const useFontFamily = () => {
  const [fontFamily, setFontFamily] = useAtom(fontFamilyAtom);

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
