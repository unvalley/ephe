import { useState, useEffect } from "react";
import { SnapshotHistoryItem } from "../features/history/history-types";
import { compareSnapshots, getSnapshots } from "../features/history/snapshot-manager";

interface SnapshotDiffProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnapshotDiff = ({ isOpen, onClose }: SnapshotDiffProps) => {
  const [snapshots, setSnapshots] = useState<SnapshotHistoryItem[]>([]);
  const [snapshot1Id, setSnapshot1Id] = useState<string>("");
  const [snapshot2Id, setSnapshot2Id] = useState<string>("");
  const [diffResult, setDiffResult] = useState<{ additions: string[]; deletions: string[] } | null>(null);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscKey);

    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const allSnapshots = getSnapshots();
      setSnapshots(allSnapshots);

      if (allSnapshots.length >= 2) {
        setSnapshot1Id(allSnapshots[0].id);
        setSnapshot2Id(allSnapshots[1].id);
      }
    }
  }, [isOpen]);

  const handleCompare = () => {
    if (snapshot1Id && snapshot2Id) {
      const result = compareSnapshots(snapshot1Id, snapshot2Id);
      setDiffResult(result);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Compare Snapshots</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Snapshot</label>
            <select
              value={snapshot1Id}
              onChange={(e) => setSnapshot1Id(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.title} ({new Date(snapshot.timestamp).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Second Snapshot</label>
            <select
              value={snapshot2Id}
              onChange={(e) => setSnapshot2Id(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.title} ({new Date(snapshot.timestamp).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <button
            onClick={handleCompare}
            className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Compare
          </button>
        </div>

        {diffResult && (
          <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 gap-0">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-r border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Deletions</h4>
                <div className="text-sm font-mono overflow-auto max-h-60">
                  {diffResult.deletions.length > 0 ? (
                    diffResult.deletions.map((line, i) => (
                      <div key={i} className="text-red-600 dark:text-red-400 py-0.5">
                        - {line}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400">No deletions</div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20">
                <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Additions</h4>
                <div className="text-sm font-mono overflow-auto max-h-60">
                  {diffResult.additions.length > 0 ? (
                    diffResult.additions.map((line, i) => (
                      <div key={i} className="text-green-600 dark:text-green-400 py-0.5">
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
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
