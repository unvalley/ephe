import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveSnapshot,
  getSnapshots,
  getSnapshotsByDate,
  getSnapshotById,
  deleteSnapshot,
  purgeAllSnapshots
} from './snapshot-storage';
import type { Snapshot } from './snapshot-types';

describe('Snapshot Storage', () => {
  const SNAPSHOTS_STORAGE_KEY = 'ephe-snapshots';
  
  beforeEach(() => {
    // Mock localStorage
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
  });

  it('should save a snapshot', () => {
    const snapshot = {
      content: 'Test content',
      title: 'Test snapshot',
      description: 'Test description',
      charCount: 12,
    };

    saveSnapshot(snapshot);

    const savedSnapshots = getSnapshots();
    expect(savedSnapshots.length).toBe(1);
    expect(savedSnapshots[0].title).toBe('Test snapshot');
    expect(savedSnapshots[0].content).toBe('Test content');
    expect(savedSnapshots[0].id).toBeDefined();
    expect(savedSnapshots[0].timestamp).toBeDefined();
  });

  it('should get all snapshots', () => {
    const mockSnapshots: Snapshot[] = [
      {
        id: 'test-id-1',
        content: 'Test content 1',
        title: 'Test snapshot 1',
        description: 'Test description 1',
        charCount: 14,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'test-id-2',
        content: 'Test content 2',
        title: 'Test snapshot 2',
        description: 'Test description 2',
        charCount: 14,
        timestamp: new Date().toISOString(),
      },
    ];

    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(mockSnapshots));

    const result = getSnapshots();
    expect(result).toEqual(mockSnapshots);
  });

  it('should get snapshots by date', () => {
    // Create snapshots with different dates
    const date1 = new Date('2023-01-15T12:00:00Z');
    const date2 = new Date('2023-02-20T12:00:00Z');
    
    const mockSnapshots: Snapshot[] = [
      {
        id: 'test-id-1',
        content: 'Test content 1',
        title: 'Test snapshot 1',
        description: 'Test description 1',
        charCount: 14,
        timestamp: date1.toISOString(),
      },
      {
        id: 'test-id-2',
        content: 'Test content 2',
        title: 'Test snapshot 2',
        description: 'Test description 2',
        charCount: 14,
        timestamp: date2.toISOString(),
      },
    ];

    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(mockSnapshots));

    // Test filtering by year
    const resultsByYear = getSnapshotsByDate({ year: 2023 });
    expect(Object.keys(resultsByYear).length).toBe(2); // Two different dates

    // Test filtering by month
    const resultsByMonth = getSnapshotsByDate({ month: 1 }); // January
    expect(Object.keys(resultsByMonth).length).toBe(1);
    
    // Test filtering by day
    const resultsByDay = getSnapshotsByDate({ day: 15 });
    expect(Object.keys(resultsByDay).length).toBe(1);
  });

  it('should get a snapshot by ID', () => {
    const mockSnapshots: Snapshot[] = [
      {
        id: 'test-id-1',
        content: 'Test content 1',
        title: 'Test snapshot 1',
        description: 'Test description 1',
        charCount: 14,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'test-id-2',
        content: 'Test content 2',
        title: 'Test snapshot 2',
        description: 'Test description 2',
        charCount: 14,
        timestamp: new Date().toISOString(),
      },
    ];

    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(mockSnapshots));

    const result = getSnapshotById('test-id-1');
    expect(result).toEqual(mockSnapshots[0]);
    
    const nonExistentResult = getSnapshotById('non-existent-id');
    expect(nonExistentResult).toBeNull();
  });

  it('should delete a snapshot by ID', () => {
    const mockSnapshots: Snapshot[] = [
      {
        id: 'test-id-1',
        content: 'Test content 1',
        title: 'Test snapshot 1',
        description: 'Test description 1',
        charCount: 14,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'test-id-2',
        content: 'Test content 2',
        title: 'Test snapshot 2',
        description: 'Test description 2',
        charCount: 14,
        timestamp: new Date().toISOString(),
      },
    ];

    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(mockSnapshots));

    deleteSnapshot('test-id-1');
    
    const remainingSnapshots = getSnapshots();
    expect(remainingSnapshots.length).toBe(1);
    expect(remainingSnapshots[0].id).toBe('test-id-2');
  });

  it('should purge all snapshots', () => {
    const mockSnapshots: Snapshot[] = [
      {
        id: 'test-id-1',
        content: 'Test content 1',
        title: 'Test snapshot 1',
        description: 'Test description 1',
        charCount: 14,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'test-id-2',
        content: 'Test content 2',
        title: 'Test snapshot 2',
        description: 'Test description 2',
        charCount: 14,
        timestamp: new Date().toISOString(),
      },
    ];

    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(mockSnapshots));

    purgeAllSnapshots();
    
    const remainingSnapshots = getSnapshots();
    expect(remainingSnapshots.length).toBe(0);
  });
}); 