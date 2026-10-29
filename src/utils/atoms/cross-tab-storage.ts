// localStorage-backed jotai storage that also syncs changes made in other tabs
export const createCrossTabStorage = <T>() => {
  return {
    getItem: (key: string, initialValue: T): T => {
      if (typeof window === "undefined") {
        return initialValue;
      }
      const item = localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      try {
        return JSON.parse(item);
      } catch {
        return initialValue;
      }
    },
    setItem: (key: string, value: T): void => {
      if (typeof window === "undefined") {
        return;
      }
      localStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: (key: string): void => {
      if (typeof window === "undefined") {
        return;
      }
      localStorage.removeItem(key);
    },
    subscribe: (key: string, callback: (value: T) => void, initialValue: T): (() => void) => {
      if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
        return () => {};
      }
      const handler = (e: StorageEvent) => {
        if (e.storageArea === localStorage && e.key === key) {
          try {
            const newValue = e.newValue ? JSON.parse(e.newValue) : initialValue;
            callback(newValue);
          } catch {
            callback(initialValue);
          }
        }
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
};
