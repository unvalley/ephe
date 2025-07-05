import { atom } from 'jotai';
import type { Snapshot } from '../snapshots/snapshot-storage';
import { snapshotStorage } from '../snapshots/snapshot-storage';
import { FileSystemService } from './file-system-service';
import { IndexedDBService } from './indexed-db-service';
import type { SyncConfig, SyncStatus, SyncEvent, SyncEventType } from './types';

export class SyncManager {
  public fileSystemService: FileSystemService;
  private indexedDBService: IndexedDBService;
  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private syncInProgress = false;
  private eventListeners: Map<string, Set<(event: SyncEvent) => void>> = new Map();

  constructor() {
    this.fileSystemService = new FileSystemService();
    this.indexedDBService = new IndexedDBService();
  }

  async init(): Promise<void> {
    if (!this.fileSystemService.isSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }

    await this.indexedDBService.init();
    
    const savedHandle = await this.indexedDBService.getDirectoryHandle();
    if (savedHandle) {
      const hasPermission = await this.fileSystemService.verifyPermission(savedHandle);
      if (hasPermission) {
        this.directoryHandle = savedHandle;
      } else {
        await this.indexedDBService.clearDirectoryHandle();
      }
    }
  }

  async enableSync(): Promise<void> {
    try {
      const handle = await this.fileSystemService.selectDirectory();
      await this.indexedDBService.saveDirectoryHandle(handle);
      this.directoryHandle = handle;
      
      await this.performInitialSync();
      
      this.emit({
        type: 'sync-completed',
        timestamp: new Date(),
        data: { initial: true }
      });
    } catch (error) {
      this.emit({
        type: 'sync-error',
        timestamp: new Date(),
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    }
  }

  async disableSync(): Promise<void> {
    await this.indexedDBService.clearDirectoryHandle();
    this.directoryHandle = null;
  }

  isEnabled(): boolean {
    return this.directoryHandle !== null;
  }

  async getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    return this.directoryHandle;
  }

  async syncSnapshot(snapshot: Snapshot): Promise<void> {
    if (!this.directoryHandle) {
      throw new Error('Sync is not enabled');
    }

    const filename = this.fileSystemService.generateFilename(snapshot.id, snapshot.timestamp);
    
    const metadata = this.createMetadata(snapshot);
    const content = this.formatMarkdownContent(snapshot.content, metadata);
    
    await this.fileSystemService.writeFile(this.directoryHandle, filename, content);
    
    this.emit({
      type: 'file-changed',
      timestamp: new Date(),
      data: { filename, action: 'write' }
    });
  }

  async syncAllSnapshots(): Promise<void> {
    if (!this.directoryHandle || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    this.emit({ type: 'sync-started', timestamp: new Date() });

    try {
      const snapshots = snapshotStorage.getAll();
      
      for (const snapshot of snapshots) {
        await this.syncSnapshot(snapshot);
      }

      await this.cleanupOrphanedFiles(snapshots);
      
      this.emit({ type: 'sync-completed', timestamp: new Date() });
    } catch (error) {
      this.emit({
        type: 'sync-error',
        timestamp: new Date(),
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  async performInitialSync(): Promise<void> {
    if (!this.directoryHandle) {
      return;
    }

    const existingFiles = await this.fileSystemService.readAllNotes(this.directoryHandle);
    const localSnapshots = snapshotStorage.getAll();
    
    const fileMap = new Map(existingFiles.map(f => [f.id, f]));
    const localMap = new Map(localSnapshots.map(s => [s.id, s]));
    
    for (const [id, fileNote] of fileMap) {
      const localSnapshot = localMap.get(id);
      
      if (!localSnapshot || new Date(fileNote.lastModified) > new Date(localSnapshot.timestamp)) {
        const snapshot: Snapshot = {
          id: fileNote.id,
          timestamp: new Date(fileNote.lastModified).toISOString(),
          content: this.extractContentFromMarkdown(fileNote.content),
          charCount: fileNote.content.length,
        };
        
        snapshotStorage.add(snapshot);
      }
    }
    
    for (const [id, localSnapshot] of localMap) {
      if (!fileMap.has(id)) {
        await this.syncSnapshot(localSnapshot);
      }
    }
  }

  private async cleanupOrphanedFiles(currentSnapshots: Snapshot[]): Promise<void> {
    if (!this.directoryHandle) return;

    const currentIds = new Set(currentSnapshots.map(s => s.id));
    const files = await this.fileSystemService.listMarkdownFiles(this.directoryHandle);
    
    for (const file of files) {
      const id = this.fileSystemService.extractIdFromFilename(file.filename);
      if (!currentIds.has(id)) {
        await this.fileSystemService.deleteFile(this.directoryHandle, file.filename);
      }
    }
  }

  private createMetadata(snapshot: Snapshot): Record<string, string | number> {
    return {
      id: snapshot.id,
      created: snapshot.timestamp,
      lastModified: new Date().toISOString(),
      charCount: snapshot.charCount,
      app: 'Ephe',
      version: '1.0.0',
    };
  }

  private formatMarkdownContent(content: string, metadata: Record<string, string | number>): string {
    const frontmatter = [
      '---',
      ...Object.entries(metadata).map(([key, value]) => `${key}: ${value}`),
      '---',
      '',
    ].join('\n');
    
    return frontmatter + content;
  }

  private extractContentFromMarkdown(markdown: string): string {
    const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
    return markdown.replace(frontmatterRegex, '').trim();
  }

  on(event: SyncEventType, callback: (event: SyncEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  off(event: SyncEventType, callback: (event: SyncEvent) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: SyncEvent): void {
    this.eventListeners.get(event.type)?.forEach(cb => cb(event));
  }
}

export const syncManager = new SyncManager();

export const syncConfigAtom = atom<SyncConfig>({
  enabled: false,
});

export const syncStatusAtom = atom<SyncStatus>({
  isSyncing: false,
  pendingChanges: 0,
});