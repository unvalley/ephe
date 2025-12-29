"use client";

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
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
  },
} as const;

export type FontFamily = keyof typeof FONT_FAMILIES;
export const FONT_FAMILY_OPTIONS = Object.keys(FONT_FAMILIES) as (keyof typeof FONT_FAMILIES)[];

export const fontFamilyAtom = atomWithStorage<FontFamily>(LOCAL_STORAGE_KEYS.FONT_FAMILY, "IA_WRITER_MONO");

export const currentFontValueAtom = atom((get) => FONT_FAMILIES[get(fontFamilyAtom)].value);
export const currentFontDisplayValueAtom = atom((get) => FONT_FAMILIES[get(fontFamilyAtom)].displayValue);
