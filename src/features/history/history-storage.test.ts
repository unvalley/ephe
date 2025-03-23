import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveHistoryItem,
  getHistoryItems,
  getHistoryItemsByType,
  getHistoryItemsByDate,
  deleteHistoryItem,
  purgeHistoryItemsByType,
  purgeAllHistoryItems,
} from './history-storage';

describe('History Storage', () => {
  const HISTORY_STORAGE_KEY = 'ephe-history';
  
  beforeEach(() => {
    // localStorage のモック
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
          store[key] = value.toString();
        }),
        removeItem: vi.fn((key) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should save a history item', () => {
    const item = {
      type: 'task' as const,
      text: 'Test task',
      originalLine: '- [ ] Test task',
    };

    saveHistoryItem(item);

    expect(localStorage.setItem).toHaveBeenCalled();
    const savedItems = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
    expect(savedItems.length).toBe(1);
    expect(savedItems[0].type).toBe('task');
    expect(savedItems[0].text).toBe('Test task');
    expect(savedItems[0].id).toBeDefined();
    expect(savedItems[0].timestamp).toBeDefined();
  });

  it('should get all history items', () => {
    const mockItems = [
      {
        id: 'test-id-1',
        type: 'task',
        text: 'Test task',
        originalLine: '- [ ] Test task',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'test-id-2',
        type: 'edit',
        changeDescription: 'Test edit',
        timestamp: new Date().toISOString(),
      },
    ];

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(mockItems));

    const result = getHistoryItems();
    expect(result).toEqual(mockItems);
  });

  // 他のテストケースも同様に実装
}); 