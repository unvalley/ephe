export interface SyncedNote {
  id: string;
  filename: string;
  content: string;
  lastModified: number;
  checksum?: string;
}

export interface SyncConfig {
  enabled: boolean;
  directoryHandle?: FileSystemDirectoryHandle;
  lastSyncTime?: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSync?: Date;
  error?: string;
  pendingChanges: number;
}

export interface FileMetadata {
  filename: string;
  lastModified: number;
  size: number;
}

export type SyncEventType = 'sync-started' | 'sync-completed' | 'sync-error' | 'file-changed';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: Date;
  data?: {
    error?: string;
    filename?: string;
    action?: string;
    initial?: boolean;
  };
}