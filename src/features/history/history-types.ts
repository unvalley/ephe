/**
 * History system data types
 */

export type HistoryItemType = "task" | "snapshot";

export type BaseHistoryItem = {
  id: string;
  timestamp: string; // ISO string
}

// Task history item (extends existing CompletedTask)
export type TaskHistoryItem = BaseHistoryItem & {
  type: "task";
  content: string;
  taskIdentifier: string;
  originalLine: string;
  // A section that the task belongs to
  section: string | undefined;
}

// Snapshot history
export type SnapshotHistoryItem = BaseHistoryItem & {
  type: "snapshot";
  content: string;
  title: string;
  description: string;
  charCount: number;
}

export type HistoryItem = TaskHistoryItem | SnapshotHistoryItem; 