import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSnapshot, getSnapshotById, deleteSnapshot } from './snapshot-manager';
import { saveHistoryItem, getHistoryItemsByType, deleteHistoryItem } from './history-storage';

// モックの設定
vi.mock('./history-storage', () => ({
  saveHistoryItem: vi.fn(),
  getHistoryItemsByType: vi.fn(),
  deleteHistoryItem: vi.fn(),
}));

describe('Snapshot Manager', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a snapshot', () => {
    const content = 'Test content';
    const title = 'Test snapshot';
    const description = 'Test description';
    const tags = ['test'];

    createSnapshot(content, title, description, tags);

    expect(saveHistoryItem).toHaveBeenCalledWith({
      type: 'snapshot',
      content,
      title,
      description,
      tags,
      charCount: content.length,
    });
  });

  it('should get a snapshot by id', () => {
    const mockSnapshot = {
      id: 'test-id',
      type: 'snapshot',
      content: 'Test content',
      title: 'Test snapshot',
      timestamp: new Date().toISOString(),
      charCount: 12,
    };

    (getHistoryItemsByType as any).mockReturnValue([mockSnapshot]);

    const result = getSnapshotById('test-id');
    expect(result).toEqual(mockSnapshot);
    expect(getHistoryItemsByType).toHaveBeenCalledWith('snapshot');
  });

  it('should return null when snapshot not found', () => {
    (getHistoryItemsByType as any).mockReturnValue([]);

    const result = getSnapshotById('non-existent-id');
    expect(result).toBeNull();
  });

  it('should delete a snapshot', () => {
    deleteSnapshot('test-id');
    expect(deleteHistoryItem).toHaveBeenCalledWith('test-id');
  });
}); 