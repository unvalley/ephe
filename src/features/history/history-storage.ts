/**
 * History storage utilities
 */

import type { 
  HistoryItem, 
  TaskHistoryItem, 
  HistoryItemType
} from './history-types';

const HISTORY_STORAGE_KEY = 'ephe-history';

/**
 * Save a history item to localStorage
 */
export const saveHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>): void => {
  try {
    const now = new Date();
    const id = `history-${now.getTime()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const historyItem: HistoryItem = {
      ...item,
      id,
      timestamp: now.toISOString(),
    } as HistoryItem;
    
    const existingItemsJson = localStorage.getItem(HISTORY_STORAGE_KEY);
    const existingItems: HistoryItem[] = existingItemsJson ? JSON.parse(existingItemsJson) : [];
    
    // Check for duplicates if it's a task
    if (item.type === 'task' && (item as TaskHistoryItem).taskIdentifier) {
      const taskItem = item as TaskHistoryItem;
      const taskExists = existingItems.some(
        existingItem => 
          existingItem.type === 'task' && 
          (existingItem as TaskHistoryItem).taskIdentifier === taskItem.taskIdentifier
      );
      
      if (taskExists) return;
    }
    
    localStorage.setItem(
      HISTORY_STORAGE_KEY, 
      JSON.stringify([historyItem, ...existingItems])
    );
  } catch (error) {
    console.error('Error saving history item:', error);
  }
};

/**
 * Get all history items from localStorage
 */
export const getHistoryItems = (): HistoryItem[] => {
  try {
    const itemsJson = localStorage.getItem(HISTORY_STORAGE_KEY);
    return itemsJson ? JSON.parse(itemsJson) : [];
  } catch (error) {
    console.error('Error retrieving history items:', error);
    return [];
  }
};

/**
 * Get history items of a specific type
 */
export const getHistoryItemsByType = <T extends HistoryItem>(type: T['type']): T[] => {
  const items = getHistoryItems();
  return items.filter(item => item.type === type) as T[];
};

/**
 * Group history items by date (YYYY-MM-DD) with optional filtering
 */
export const getHistoryItemsByDate = (
  filter?: { year?: number; month?: number; day?: number; types?: HistoryItemType[] }
): Record<string, HistoryItem[]> => {
  const items = getHistoryItems();
  const itemsByDate: Record<string, HistoryItem[]> = {};
  
  // Filter items if filter is provided
  const filteredItems = items.filter(item => {
    if (!filter) return true;
    
    const date = new Date(item.timestamp);
    const itemYear = date.getFullYear();
    const itemMonth = date.getMonth() + 1;
    const itemDay = date.getDate();
    
    // Apply date filters
    if (filter.year && itemYear !== filter.year) return false;
    if (filter.month && itemMonth !== filter.month) return false;
    if (filter.day && itemDay !== filter.day) return false;
    
    // Apply type filter
    if (filter.types && !filter.types.includes(item.type)) return false;
    
    return true;
  });
  
  // Group filtered items by date
  for (const item of filteredItems) {
    const date = new Date(item.timestamp);
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!itemsByDate[localDateStr]) {
      itemsByDate[localDateStr] = [];
    }
    itemsByDate[localDateStr].push(item);
  }
  
  return itemsByDate;
};

/**
 * Delete a history item by ID
 */
export const deleteHistoryItem = (itemId: string): void => {
  try {
    const items = getHistoryItems();
    const updatedItems = items.filter(item => item.id !== itemId);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedItems));
  } catch (error) {
    console.error('Error deleting history item:', error);
  }
};

/**
 * Delete a history item by its unique identifier (for tasks)
 */
export const deleteHistoryItemByIdentifier = (taskIdentifier: string): void => {
  try {
    const items = getHistoryItems();
    const updatedItems = items.filter(item => 
      !(item.type === 'task' && (item as TaskHistoryItem).taskIdentifier === taskIdentifier)
    );
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedItems));
  } catch (error) {
    console.error('Error deleting history item by identifier:', error);
  }
};

/**
 * Delete all history items of a specific type
 */
export const purgeHistoryItemsByType = (type: HistoryItemType): void => {
  try {
    const items = getHistoryItems();
    const updatedItems = items.filter(item => item.type !== type);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedItems));
  } catch (error) {
    console.error('Error purging history items:', error);
  }
};

/**
 * Delete all history items
 */
export const purgeAllHistoryItems = (): void => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Error purging all history items:', error);
  }
}; 