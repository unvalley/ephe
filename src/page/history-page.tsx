"use client";

import { useState, useEffect } from "react";
import { getSnapshotsByDate, purgeAllSnapshots, deleteSnapshot } from "../features/snapshots/snapshot-storage";
import type { Snapshot } from "../features/snapshots/snapshot-types";
import {
  getTasksByDate,
  deleteCompletedTask,
  purgeCompletedTasks,
  type CompletedTask,
} from "../features/tasks/task-storage";
import { Footer } from "../components/footer";
import { SnapshotDiff } from "../features/snapshots/snapshot-diff";
import { SnapshotViewer } from "../features/snapshots/snapshot-viewer";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/toast";
import { Loading } from "../components/loading";
import { LOCAL_STORAGE_KEYS } from "../utils/constants";

type DateFilter = {
  year?: number;
  month?: number;
  day?: number;
  types?: string[];
};

type HistoryItem = Snapshot | CompletedTask;
type HistoryItemType = "snapshot" | "task";

// Type guard to check if an item is a Snapshot
const isSnapshot = (item: HistoryItem): item is Snapshot => {
  return "title" in item && "charCount" in item;
};

// Type guard to check if an item is a CompletedTask
const isCompletedTask = (item: HistoryItem): item is CompletedTask => {
  return "completedAt" in item && !("charCount" in item);
};

export const HistoryPage = () => {
  const [historyByDate, setHistoryByDate] = useState<Record<string, HistoryItem[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<DateFilter>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const navigate = useNavigate();

  // Get available years, months, and days from all history
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);

  // Confirmation modal state
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeType, setPurgeType] = useState<HistoryItemType | "all">("all");

  // New state for snapshot comparison dialog
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);

  // New state for snapshot viewer
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // State to track expanded types
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  // Toggle expansion for a type
  const toggleTypeExpansion = (type: string) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Load history and available filter options
  useEffect(() => {
    const allHistory = getHistoryItemsByDate();
    setHistoryByDate(allHistory);
    setIsLoading(false);

    // Extract unique years, months, and days from all history
    const years = new Set<number>();
    const months = new Set<number>();

    for (const dateStr of Object.keys(allHistory)) {
      const [year, month, _] = dateStr.split("-").map(Number);
      years.add(year);
      months.add(month);
    }

    setAvailableYears(Array.from(years).sort((a, b) => b - a));
    setAvailableMonths(Array.from(months).sort((a, b) => a - b));
  }, []);

  // Apply filters when they change
  useEffect(() => {
    setHistoryByDate(getHistoryItemsByDate(filter));
  }, [filter]);

  const handleDeleteItem = (itemId: string, itemType: HistoryItemType) => {
    if (itemType === "snapshot") {
      deleteSnapshot(itemId);
    } else {
      deleteCompletedTask(itemId);
    }
    // Refresh history with current filter
    setHistoryByDate(getHistoryItemsByDate(filter));
  };

  const formatDate = (dateString: string): string => {
    // dateString is in YYYY-MM-DD format
    const [year, month, day] = dateString.split("-").map(Number);

    // Create date object using local components
    const date = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  // Reset all filters
  const resetFilters = () => {
    setFilter({});
  };

  // Update a specific filter
  const updateFilter = (key: keyof DateFilter, value: number | string | string[] | undefined) => {
    setFilter((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Purge history
  const handlePurgeHistory = () => {
    if (purgeType === "all") {
      purgeAllSnapshots();
      purgeCompletedTasks();
    } else if (purgeType === "snapshot") {
      purgeAllSnapshots();
    } else {
      purgeCompletedTasks();
    }
    setHistoryByDate(getHistoryItemsByDate(filter));
    setShowPurgeConfirm(false);
  };

  // Get combined history items by date
  const getHistoryItemsByDate = (filter?: DateFilter): Record<string, HistoryItem[]> => {
    const snapshotsByDate = getSnapshotsByDate(filter);
    const tasksByDate = getTasksByDate(filter);

    const combinedHistory: Record<string, HistoryItem[]> = {};

    // Add snapshots
    if (!filter?.types || filter.types.includes("snapshot")) {
      for (const date in snapshotsByDate) {
        if (!combinedHistory[date]) {
          combinedHistory[date] = [];
        }
        combinedHistory[date].push(...snapshotsByDate[date]);
      }
    }

    // Add tasks
    if (!filter?.types || filter.types.includes("task")) {
      for (const date in tasksByDate) {
        if (!combinedHistory[date]) {
          combinedHistory[date] = [];
        }
        combinedHistory[date].push(...tasksByDate[date]);
      }
    }

    // Sort items by timestamp
    for (const date in combinedHistory) {
      combinedHistory[date].sort((a, b) => {
        const timeA = isSnapshot(a) ? a.timestamp : a.completedAt;
        const timeB = isSnapshot(b) ? b.timestamp : b.completedAt;
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
    }

    return combinedHistory;
  };

  // Group history items by type
  const groupItemsByType = (items: HistoryItem[]): Record<string, HistoryItem[]> => {
    const itemsByType: { snapshot: Snapshot[]; task: CompletedTask[] } = {
      snapshot: items
        .filter(isSnapshot)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      task: items
        .filter(isCompletedTask)
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
    };
    return itemsByType;
  };

  // Handle viewing a snapshot
  const handleViewSnapshot = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    setViewerOpen(true);
  };

  // Get sorted dates
  const sortedDates = Object.keys(historyByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // Render a history item based on its type
  const renderHistoryItem = (item: HistoryItem) => {
    // Check if item is a snapshot
    if (isSnapshot(item)) {
      const snapshot = item;
      const time = new Date(snapshot.timestamp).toLocaleTimeString();

      return (
        <div className="flex group border-b border-gray-200 dark:border-gray-700 py-3 px-2">
          <div className="flex-1 flex items-start">
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" role="img">
                <path
                  fillRule="evenodd"
                  d="M3.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.062V4.25c0 .138.112.25.25.25h2.688a.252.252 0 00-.011-.013l-2.914-2.914a.272.272 0 00-.013-.011zM2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"
                />
              </svg>
              <div className="ml-1">
                <button
                  className="cursor-pointer hover:underline text-gray-600 dark:text-gray-100"
                  onClick={() => handleViewSnapshot(snapshot)}
                  type="button"
                >
                  {snapshot.title}
                </button>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Saved at {time}</div>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                localStorage.setItem(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, snapshot.content);
                navigate("/");
                showToast("Snapshot restored to editor", "success");
              }}
              className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
              type="button"
            >
              Restore
            </button>
            <button
              onClick={() => handleDeleteItem(snapshot.id, "snapshot")}
              className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      );
    }

    // It's a task
    const task = item as CompletedTask;
    const time = new Date(task.completedAt).toLocaleTimeString();

    return (
      <div className="flex group border-b border-gray-200 dark:border-gray-700 py-3 px-2">
        <div className="flex-1 flex items-start min-w-0">
          <div className="flex items-center min-w-0">
            <svg
              className="h-4 w-4 mr-2 text-green-600 dark:text-green-400 flex-shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
              role="img"
            >
              <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z" />
            </svg>
            <div className="ml-1 min-w-0">
              <span className="text-sm block truncate">{task.content}</span>
              <div className="text-gray-500 dark:text-gray-400 text-xs">
                Completed {task.section && <span>in {task.section} </span>} at {time}
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <button
            onClick={() => handleDeleteItem(task.id, "task")}
            className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  // Render history items for a specific date
  const renderHistoryItems = (date: string, items: HistoryItem[]) => {
    const itemsByType = groupItemsByType(items);
    const limit = 5;

    return (
      <div key={date} className="mb-8">
        <div className="mb-2 text-sm text-gray-800 dark:text-gray-100 py-2 border-b border-gray-200 dark:border-gray-700">
          {formatDate(date)}
        </div>

        {Object.entries(itemsByType).map(([historyItemType, typeItems]) => {
          if (filter.types && !filter.types.includes(historyItemType)) {
            return null;
          }

          const isExpanded = expandedTypes[`${date}-${historyItemType}`] || false;
          const displayItems = isExpanded ? typeItems : typeItems.slice(0, limit);

          if (typeItems.length === 0) {
            return null;
          }

          return (
            <div key={historyItemType} className="mb-4">
              <div className="border border-gray-100 dark:border-gray-700 rounded-md overflow-hidden">
                {displayItems.map((item) => (
                  <div key={isSnapshot(item) ? item.id : (item as CompletedTask).id}>{renderHistoryItem(item)}</div>
                ))}
                {typeItems.length > limit && (
                  <button
                    onClick={() => toggleTypeExpansion(`${date}-${historyItemType}`)}
                    className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-200 dark:border-gray-700 focus:outline-none"
                    type="button"
                  >
                    {isExpanded ? "Show less" : `Show ${typeItems.length - limit} more...`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return <Loading className="h-screen w-screen flex items-center justify-center" />;
  }

  return (
    <div className="h-screen w-screen flex flex-col antialiase">
      <div className="flex-1 pt-16 pb-8 overflow-auto">
        <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-xl text-gray-800 dark:text-gray-100">History</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Your completed tasks and snapshots.</p>
            </div>

            {/* Purge button */}
            {Object.keys(historyByDate).length > 0 && (
              <button
                onClick={() => {
                  setPurgeType("all");
                  setShowPurgeConfirm(true);
                }}
                className="px-3 py-1.5 text-sm rounded-md bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors focus:outline-none"
                type="button"
              >
                Delete All
              </button>
            )}
          </div>

          <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
            <div className="flex flex-col sm:flex-row p-2 gap-2 items-center">
              <div className="w-full sm:w-auto flex-1">
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg
                      className="h-4 w-4 text-gray-400 dark:text-gray-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      role="img"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset sm:text-sm"
                    placeholder="Search in history...(unimplemented)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full sm:w-auto">
                <select
                  id="type-filter"
                  value={filter.types ? filter.types[0] : ""}
                  onChange={(e) => {
                    const value = e.target.value as HistoryItemType;
                    updateFilter("types", value ? [value] : undefined);
                  }}
                  className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset sm:text-sm"
                >
                  <option value="">All Types</option>
                  <option value="task">Tasks</option>
                  <option value="snapshot">Snapshots</option>
                </select>
              </div>

              {/* Date filter dropdown */}
              <div className="w-full sm:w-auto">
                <select
                  id="date-filter"
                  value={filter.month ? `${filter.year}-${filter.month}` : filter.year?.toString() || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) {
                      updateFilter("year", undefined);
                      updateFilter("month", undefined);
                    } else if (value.includes("-")) {
                      const [year, month] = value.split("-").map(Number);
                      updateFilter("year", year);
                      updateFilter("month", month);
                    } else {
                      updateFilter("year", Number(value));
                      updateFilter("month", undefined);
                    }
                  }}
                  className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:ring-2 focus:ring-inset sm:text-sm"
                >
                  <option value="">All Time</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                  {availableYears.map((year) =>
                    availableMonths.map((month) => (
                      <option key={`${year}-${month}`} value={`${year}-${month}`}>
                        {new Date(year, month - 1, 1).toLocaleString("default", { month: "long", year: "numeric" })}
                      </option>
                    )),
                  )}
                </select>
              </div>

              {/* Clear filters button */}
              {(filter.year || filter.month || filter.types || searchQuery) && (
                <button
                  onClick={() => {
                    resetFilters();
                    setSearchQuery("");
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 text-sm rounded-md flex items-center justify-center  hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none"
                  type="button"
                >
                  <svg
                    className="h-3 w-3 mr-1 text-gray-500 dark:text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    role="img"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Clear
                </button>
              )}
            </div>
          </div>

          {sortedDates.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
                role="img"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="mt-4 text-gray-500 dark:text-gray-300">No history items found.</p>
              {Object.keys(filter).length > 0 && (
                <p className="mt-2 text-gray-500 dark:text-gray-300">
                  Try adjusting your filters or{" "}
                  <button
                    onClick={resetFilters}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    type="button"
                  >
                    reset them
                  </button>
                  .
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDates.map((date) => {
                const items = historyByDate[date];
                return renderHistoryItems(date, items);
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg text-gray-900 dark:text-gray-100 mb-3">Confirm Deletion</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete all history? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPurgeConfirm(false)}
                className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handlePurgeHistory}
                className="px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors"
                type="button"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      <SnapshotDiff isOpen={diffDialogOpen} onClose={() => setDiffDialogOpen(false)} />
      <SnapshotViewer isOpen={viewerOpen} onClose={() => setViewerOpen(false)} snapshot={selectedSnapshot} />
      <Footer />
    </div>
  );
};
