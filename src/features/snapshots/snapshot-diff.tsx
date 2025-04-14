import { useState, useEffect } from "react";
import { compareSnapshots } from "./snapshot-manager";
import type { Snapshot } from "./snapshot-types";
import { getSnapshots } from "./snapshot-storage";

type SnapshotDiffProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const SnapshotDiff = ({ isOpen, onClose }: SnapshotDiffProps) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot1, setSelectedSnapshot1] = useState<string>("");
  const [selectedSnapshot2, setSelectedSnapshot2] = useState<string>("");
  const [diffResult, setDiffResult] = useState<{ additions: string[]; deletions: string[] } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSnapshots(getSnapshots());
    }
  }, [isOpen]);

  const handleCompare = () => {
    if (selectedSnapshot1 && selectedSnapshot2) {
      const result = compareSnapshots(selectedSnapshot1, selectedSnapshot2);
      setDiffResult(result);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70">
      <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h3 className="mb-4 font-medium text-gray-900 text-lg dark:text-gray-100">Compare Snapshots</h3>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">First Snapshot</label>
            <select
              value={selectedSnapshot1}
              onChange={(e) => setSelectedSnapshot1(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select a snapshot</option>
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.title} ({new Date(snapshot.timestamp).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">Second Snapshot</label>
            <select
              value={selectedSnapshot2}
              onChange={(e) => setSelectedSnapshot2(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select a snapshot</option>
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.title} ({new Date(snapshot.timestamp).toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 flex justify-center">
          <button
            onClick={handleCompare}
            disabled={!selectedSnapshot1 || !selectedSnapshot2}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
            type="button"
          >
            Compare
          </button>
        </div>

        {diffResult && (
          <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200 dark:divide-gray-700">
              <div className="p-4">
                <h4 className="mb-2 font-medium text-red-600 text-sm dark:text-red-400">Deletions</h4>
                <div className="max-h-60 overflow-auto rounded-md bg-red-50 p-3 font-mono text-sm dark:bg-red-900/20">
                  {diffResult.deletions.length > 0 ? (
                    diffResult.deletions.map((line, index) => (
                      <div key={index} className="text-red-700 dark:text-red-400">
                        - {line}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400">No deletions</div>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h4 className="mb-2 font-medium text-green-600 text-sm dark:text-green-400">Additions</h4>
                <div className="max-h-60 overflow-auto rounded-md bg-green-50 p-3 font-mono text-sm dark:bg-green-900/20">
                  {diffResult.additions.length > 0 ? (
                    diffResult.additions.map((line, index) => (
                      <div key={index} className="text-green-700 dark:text-green-400">
                        + {line}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400">No additions</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
