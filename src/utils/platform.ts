const platform = (() => {
  if (typeof navigator === "undefined") return "linux";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  return "linux";
})();

export const isMac = platform === "mac";
export const isWindows = platform === "windows";
export const isLinux = platform === "linux";
export const getModifierKey = () => (isMac ? "metaKey" : "ctrlKey");
export const getModifierKeyName = () => (isMac ? "Cmd" : "Ctrl");
