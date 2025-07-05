import { useEffect, useCallback, useState } from 'react';
import { useAtom } from 'jotai';
import { syncManager, syncConfigAtom, syncStatusAtom } from './sync-manager';
import { snapshotStorage } from '../snapshots/snapshot-storage';
import type { Snapshot } from '../snapshots/snapshot-storage';
import type { SyncEvent } from './types';

export const useSync = () => {
  const [syncConfig, setSyncConfig] = useAtom(syncConfigAtom);
  const [syncStatus, setSyncStatus] = useAtom(syncStatusAtom);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initSync = async () => {
      try {
        await syncManager.init();
        setIsInitialized(true);
        setSyncConfig(prev => ({ ...prev, enabled: syncManager.isEnabled() }));
      } catch (error) {
        console.error('Failed to initialize sync:', error);
      }
    };

    initSync();
  }, [setSyncConfig]);

  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      switch (event.type) {
        case 'sync-started':
          setSyncStatus(prev => ({ ...prev, isSyncing: true }));
          break;
        case 'sync-completed':
          setSyncStatus(prev => ({
            ...prev,
            isSyncing: false,
            lastSync: event.timestamp,
            error: undefined,
          }));
          break;
        case 'sync-error':
          setSyncStatus(prev => ({
            ...prev,
            isSyncing: false,
            error: event.data?.error,
          }));
          break;
      }
    };

    syncManager.on('sync-started', handleSyncEvent);
    syncManager.on('sync-completed', handleSyncEvent);
    syncManager.on('sync-error', handleSyncEvent);

    return () => {
      syncManager.off('sync-started', handleSyncEvent);
      syncManager.off('sync-completed', handleSyncEvent);
      syncManager.off('sync-error', handleSyncEvent);
    };
  }, [setSyncStatus]);

  const enableSync = useCallback(async () => {
    try {
      await syncManager.enableSync();
      setSyncConfig(prev => ({ ...prev, enabled: true }));
    } catch (error) {
      console.error('Failed to enable sync:', error);
      throw error;
    }
  }, [setSyncConfig]);

  const disableSync = useCallback(async () => {
    try {
      await syncManager.disableSync();
      setSyncConfig(prev => ({ ...prev, enabled: false }));
    } catch (error) {
      console.error('Failed to disable sync:', error);
      throw error;
    }
  }, [setSyncConfig]);

  const syncSnapshot = useCallback(async (snapshot: Snapshot) => {
    if (!syncConfig.enabled) return;
    
    try {
      await syncManager.syncSnapshot(snapshot);
    } catch (error) {
      console.error('Failed to sync snapshot:', error);
      throw error;
    }
  }, [syncConfig.enabled]);

  const syncAllSnapshots = useCallback(async () => {
    if (!syncConfig.enabled) return;
    
    try {
      await syncManager.syncAllSnapshots();
    } catch (error) {
      console.error('Failed to sync all snapshots:', error);
      throw error;
    }
  }, [syncConfig.enabled]);

  return {
    isSupported: isInitialized && syncManager.fileSystemService?.isSupported(),
    isEnabled: syncConfig.enabled,
    isSyncing: syncStatus.isSyncing,
    lastSync: syncStatus.lastSync,
    error: syncStatus.error,
    enableSync,
    disableSync,
    syncSnapshot,
    syncAllSnapshots,
  };
};

export const useSyncSnapshot = () => {
  const { syncSnapshot, isEnabled } = useSync();

  const saveAndSyncSnapshot = useCallback(async (snapshot: Omit<Snapshot, "id" | "timestamp">) => {
    snapshotStorage.save(snapshot);
    
    if (isEnabled) {
      const snapshots = snapshotStorage.getAll();
      const latestSnapshot = snapshots[snapshots.length - 1];
      if (latestSnapshot) {
        await syncSnapshot(latestSnapshot);
      }
    }
  }, [isEnabled, syncSnapshot]);

  return { saveAndSyncSnapshot };
};