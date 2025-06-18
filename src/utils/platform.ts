export const getPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "mac";
  if (userAgent.includes("win")) return "windows";
  return "linux";
};

export const isMac = () => getPlatform() === "mac";
export const isWindows = () => getPlatform() === "windows";
export const isLinux = () => getPlatform() === "linux";

export const getModifierKey = () => {
  return isMac() ? "metaKey" : "ctrlKey";
};

export const getModifierKeyName = () => {
  return isMac() ? "Cmd" : "Ctrl";
};