export const getPlatform = () => {
  if (typeof navigator === "undefined") return "linux";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  return "linux";
};

export const isMac = () => getPlatform() === "mac";
export const isWindows = () => getPlatform() === "windows";
export const isLinux = () => getPlatform() === "linux";

export const getModifierKeyName = () => {
  return isMac() ? "Cmd" : "Ctrl";
};

export const isLinkActivationModifier = (e: MouseEvent): boolean => (isMac() ? e.metaKey : e.ctrlKey);
