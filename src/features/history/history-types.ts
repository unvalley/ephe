/**
 * History system data types
 */

export type HistoryItemType = "task" | "snapshot";

export interface BaseHistoryItem {
  id: string;
  timestamp: string; // ISO string
  type: HistoryItemType;
}

// Task history item (extends existing CompletedTask)
export interface TaskHistoryItem extends BaseHistoryItem {
  type: 'task';
  text: string;
  originalLine: string;
  taskIdentifier?: string;
  section?: string;
}

// Snapshot history
export interface SnapshotHistoryItem extends BaseHistoryItem {
  type: 'snapshot';
  content: string;
  title: string;
  description?: string;
  charCount: number;
}

export type HistoryItem = TaskHistoryItem | SnapshotHistoryItem; 