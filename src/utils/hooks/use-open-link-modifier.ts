import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../constants";

export type OpenLinkModifier = "cmd" | "ctrl" | "ctrlAlt" | "alt";

const detectDefaultModifier = (): OpenLinkModifier => {
  const ua = navigator.userAgent.toLowerCase();
  const isMac = ua.includes("mac");
  const isFirefox = ua.includes("firefox");
  const isLinux = ua.includes("linux") || ua.includes("x11");
  
  if (isMac) return "cmd";
  if (isLinux && isFirefox) return "ctrlAlt";
  return "ctrl";
};

const openLinkModifierAtom = atomWithStorage<OpenLinkModifier>(
  LOCAL_STORAGE_KEYS.OPEN_LINK_MODIFIER,
  detectDefaultModifier()
);

export const useOpenLinkModifier = () => {
  const [openLinkModifier, setOpenLinkModifier] = useAtom(openLinkModifierAtom);

  return {
    openLinkModifier,
    setOpenLinkModifier,
  };
};