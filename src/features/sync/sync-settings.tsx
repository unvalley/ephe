import type React from 'react';
import { useSync } from './use-sync';
import { Folder, FolderOpen, ArrowsClockwise, Warning, CheckCircle } from '@phosphor-icons/react';

export const SyncSettings: React.FC = () => {
  const {
    isSupported,
    isEnabled,
    isSyncing,
    lastSync,
    error,
    enableSync,
    disableSync,
    syncAllSnapshots,
  } = useSync();

  if (!isSupported) {
    return (
      <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <Warning className="size-5 text-amber-600 dark:text-amber-400" weight="light" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Cross-browser sync is not supported in your browser. Please use a Chromium-based browser
            (Chrome, Edge, Brave, etc.) to enable this feature.
          </p>
        </div>
      </div>
    );
  }

  const formatLastSync = (date: Date | undefined) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Cross-Browser Sync</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Sync your notes across browsers using a local folder
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <CheckCircle className="size-4 text-green-500 dark:text-green-400" weight="light" />
              <span>Sync enabled</span>
            </div>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <Warning className="size-5 text-red-600 dark:text-red-400" weight="light" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {!isEnabled ? (
          <button
            type="button"
            onClick={enableSync}
            className="w-full rounded border border-transparent bg-neutral-100 px-4 py-2 text-sm transition-colors hover:bg-neutral-200 focus-visible:ring-offset-2 dark:bg-neutral-700/50 dark:hover:bg-neutral-600 flex items-center justify-center gap-2"
          >
            <Folder className="size-4" weight="light" />
            Select Sync Folder
          </button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={syncAllSnapshots}
                disabled={isSyncing}
                className="w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm transition-colors hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center gap-2"
              >
                <ArrowsClockwise className={`size-4 ${isSyncing ? 'animate-spin' : ''}`} weight="light" />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                type="button"
                onClick={disableSync}
                className="w-full rounded border border-neutral-200 bg-white px-4 py-2 text-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center gap-2"
              >
                <FolderOpen className="size-4" weight="light" />
                Disable Sync
              </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
              Last sync: {formatLastSync(lastSync)}
            </p>
          </>
        )}
      </div>

      <div className="rounded-lg bg-neutral-100/50 dark:bg-neutral-800/50 p-4 text-sm space-y-2">
        <p className="font-medium text-neutral-900 dark:text-neutral-100">How it works:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
          <li>Your notes are saved as .md files in your chosen folder</li>
          <li>Changes sync automatically when you save snapshots</li>
          <li>Works with cloud services like Dropbox or iCloud Drive</li>
          <li>No server required - everything stays on your device</li>
        </ul>
      </div>
    </div>
  );
};