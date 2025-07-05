import { useEffect } from 'react';
import { syncManager } from './sync-manager';

export const SyncInitializer = () => {
  useEffect(() => {
    // Initialize sync manager when the app starts
    syncManager.init().catch(error => {
      console.error('Failed to initialize sync manager:', error);
    });
  }, []);

  return null;
};