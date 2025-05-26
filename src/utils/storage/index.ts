export interface StorageProvider {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

// Define a DateFilter type to be reused
export type DateFilter = {
  year?: number;
  month?: number;
  day?: number;
};

// Base Storage interface using function properties
type Storage<T> = {
  getAll: () => T[];
  getById: (id: string) => T | null;
  save: (item: T) => void;
  deleteById: (id: string) => void;
  deleteAll: () => void;
};

// Create browser local storage provider
export const createBrowserLocalStorage = (): StorageProvider => ({
  getItem: (key: string): string | null => localStorage.getItem(key),
  setItem: (key: string, value: string): void => localStorage.setItem(key, value),
});

// Pure utility functions for date handling
export const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const filterItemsByDate = <T extends { timestamp?: string; completedAt?: string }>(
  items: T[],
  filter?: DateFilter,
): T[] => {
  if (!filter) return items;

  return items.filter((item) => {
    const dateStr =
      "timestamp" in item && item.timestamp
        ? item.timestamp
        : "completedAt" in item && item.completedAt
          ? item.completedAt
          : "";

    if (!dateStr) return false;

    const date = new Date(dateStr);
    const itemYear = date.getFullYear();
    const itemMonth = date.getMonth() + 1; // JavaScript months are 0-indexed
    const itemDay = date.getDate();

    // Apply filters
    if (filter.year && itemYear !== filter.year) return false;
    if (filter.month && itemMonth !== filter.month) return false;
    if (filter.day && itemDay !== filter.day) return false;

    return true;
  });
};

export const groupItemsByDate = <T extends { timestamp?: string; completedAt?: string }>(
  items: T[],
): Record<string, T[]> => {
  const itemsByDate: Record<string, T[]> = {};

  for (const item of items) {
    const dateStr =
      "timestamp" in item && item.timestamp
        ? item.timestamp
        : "completedAt" in item && item.completedAt
          ? item.completedAt
          : "";

    if (!dateStr) continue;

    const date = new Date(dateStr);
    const localDateStr = formatDateKey(date);

    if (!itemsByDate[localDateStr]) {
      itemsByDate[localDateStr] = [];
    }
    itemsByDate[localDateStr].push(item);
  }

  return itemsByDate;
};

// Generic storage factory function
export const createStorage = <T extends { id: string }>(storage: StorageProvider, storageKey: string): Storage<T> => {
  const getAll = (): T[] => {
    try {
      const itemsJson = storage.getItem(storageKey);
      return itemsJson ? JSON.parse(itemsJson) : [];
    } catch (error) {
      console.error(`Error retrieving items from ${storageKey}:`, error);
      return [];
    }
  };

  const getById = (id: string): T | null => {
    const items = getAll();
    return items.find((item) => item.id === id) || null;
  };

  const save = (item: T): void => {
    try {
      const existingItems = getAll();
      storage.setItem(storageKey, JSON.stringify([item, ...existingItems]));
    } catch (error) {
      console.error(`Error saving item to ${storageKey}:`, error);
    }
  };

  const deleteById = (id: string): void => {
    try {
      const items = getAll();
      const updatedItems = items.filter((item) => item.id !== id);
      storage.setItem(storageKey, JSON.stringify(updatedItems));
    } catch (error) {
      console.error(`Error deleting item from ${storageKey}:`, error);
    }
  };

  const deleteAll = (): void => {
    try {
      storage.setItem(storageKey, JSON.stringify([]));
    } catch (error) {
      console.error(`Error purging items from ${storageKey}:`, error);
    }
  };

  return {
    getAll,
    getById,
    save,
    deleteById: deleteById,
    deleteAll: deleteAll,
  };
};

// Create singleton instances for the app to use
export const defaultStorageProvider = createBrowserLocalStorage();
