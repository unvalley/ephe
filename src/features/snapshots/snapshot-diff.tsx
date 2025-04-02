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
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Compare Snapshots</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Snapshot</label>
            <select
              value={selectedSnapshot1}
              onChange={(e) => setSelectedSnapshot1(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Second Snapshot</label>
            <select
              value={selectedSnapshot2}
              onChange={(e) => setSelectedSnapshot2(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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

        <div className="flex justify-center mb-4">
          <button
            onClick={handleCompare}
            disabled={!selectedSnapshot1 || !selectedSnapshot2}
            className="px-4 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 transition-colors"
            type="button"
          >
            Compare
          </button>
        </div>

        {diffResult && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200 dark:divide-gray-700">
              <div className="p-4">
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Deletions</h4>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md font-mono text-sm overflow-auto max-h-60">
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
                <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Additions</h4>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md font-mono text-sm overflow-auto max-h-60">
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

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
