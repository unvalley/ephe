import { useEffect, useState } from 'react';
import { syncManager } from './sync-manager';
import type { Snapshot } from '../snapshots/snapshot-storage';

export const useSyncStatus = (snapshots: Snapshot[]) => {
  const [syncedSnapshots, setSyncedSnapshots] = useState<Set<string>>(new Set());
  const [isCheckingSync, setIsCheckingSync] = useState(false);

  useEffect(() => {
    const checkSyncStatus = async () => {
      if (!syncManager.isEnabled() || snapshots.length === 0) {
        setSyncedSnapshots(new Set());
        return;
      }

      setIsCheckingSync(true);
      try {
        const directoryHandle = await syncManager.getDirectoryHandle();
        if (!directoryHandle) {
          setSyncedSnapshots(new Set());
          return;
        }

        const files = await syncManager.fileSystemService.listMarkdownFiles(directoryHandle);
        const syncedIds = new Set<string>();

        for (const file of files) {
          const id = syncManager.fileSystemService.extractIdFromFilename(file.filename);
          syncedIds.add(id);
        }

        setSyncedSnapshots(syncedIds);
      } catch (error) {
        console.error('Failed to check sync status:', error);
        setSyncedSnapshots(new Set());
      } finally {
        setIsCheckingSync(false);
      }
    };

    checkSyncStatus();

    // Listen for sync events
    const handleSyncEvent = () => {
      checkSyncStatus();
    };

    syncManager.on('sync-completed', handleSyncEvent);
    syncManager.on('file-changed', handleSyncEvent);

    return () => {
      syncManager.off('sync-completed', handleSyncEvent);
      syncManager.off('file-changed', handleSyncEvent);
    };
  }, [snapshots]);

  return {
    isSynced: (snapshotId: string) => syncedSnapshots.has(snapshotId),
    isCheckingSync,
    syncedCount: syncedSnapshots.size,
  };
};