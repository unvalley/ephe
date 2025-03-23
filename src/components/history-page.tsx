"use client";

import { useState, useEffect } from "react";
import {
  getHistoryItemsByDate,
  purgeAllHistoryItems,
  deleteHistoryItem,
  purgeHistoryItemsByType,
} from "../features/history/history-storage";
import type {
  HistoryItem,
  HistoryItemType,
  TaskHistoryItem,
  SnapshotHistoryItem,
} from "../features/history/history-types";
import { Footer } from "./footer";
import { useNavigate } from "react-router-dom";
import { EDITOR_CONTENT_KEY } from "../features/monaco";
import { SnapshotDiff } from "./snapshot-diff";
import { SnapshotViewer } from "./snapshot-viewer";

type DateFilter = {
  year?: number;
  month?: number;
  day?: number;
  types?: HistoryItemType[];
};

export const HistoryPage = () => {
  const [historyByDate, setHistoryByDate] = useState<Record<string, HistoryItem[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<DateFilter>({});

  // Get available years, months, and days from all history
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);
  const [availableDays, setAvailableDays] = useState<number[]>([]);

  // Confirmation modal state
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeType, setPurgeType] = useState<HistoryItemType | "all">("all");

  const navigate = useNavigate();

  // New state for snapshot comparison dialog
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);

  // New state for snapshot viewer
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotHistoryItem | null>(null);
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
    const days = new Set<number>();

    Object.keys(allHistory).forEach((dateStr) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      years.add(year);
      months.add(month);
      days.add(day);
    });

    setAvailableYears(Array.from(years).sort((a, b) => b - a));
    setAvailableMonths(Array.from(months).sort((a, b) => a - b));
    setAvailableDays(Array.from(days).sort((a, b) => a - b));
  }, []);

  // Apply filters when they change
  useEffect(() => {
    setHistoryByDate(getHistoryItemsByDate(filter));
  }, [filter]);

  const handleDeleteItem = (itemId: string) => {
    deleteHistoryItem(itemId);
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
  const updateFilter = (key: keyof DateFilter, value: any) => {
    setFilter((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Purge history
  const handlePurgeHistory = () => {
    if (purgeType === "all") {
      purgeAllHistoryItems();
    } else {
      purgeHistoryItemsByType(purgeType);
    }
    setHistoryByDate(getHistoryItemsByDate(filter));
    setShowPurgeConfirm(false);
  };

  // Group history items by type
  const groupItemsByType = (items: HistoryItem[]): Record<string, HistoryItem[]> => {
    const itemsByType: Record<string, HistoryItem[]> = {};

    // アイテムをタイプごとに分類
    for (const item of items) {
      if (!itemsByType[item.type]) {
        itemsByType[item.type] = [];
      }
      itemsByType[item.type].push(item);
    }

    for (const type of Object.keys(itemsByType)) {
      itemsByType[type].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // タスクセクションがない場合は空の配列を追加
    if (!itemsByType["task"]) {
      itemsByType["task"] = [];
    }

    return itemsByType;
  };

  // Handle viewing a snapshot
  const handleViewSnapshot = (snapshot: SnapshotHistoryItem) => {
    setSelectedSnapshot(snapshot);
    setViewerOpen(true);
  };

  // Handle restoring a snapshot
  const handleRestoreSnapshot = (snapshot: SnapshotHistoryItem) => {
    console.log("handleRestoreSnapshot", snapshot);
    // Restore the snapshot content to the editor
    localStorage.setItem(EDITOR_CONTENT_KEY, snapshot.content);

    // Navigate to the editor
    navigate("/");

    // Show a toast notification
    import("../components/toast").then(({ showToast }) => {
      showToast("Snapshot restored to editor", "success");
    });
  };

  // Handle comparing snapshots
  const handleCompareSnapshots = () => {
    setDiffDialogOpen(true);
  };

  // Render a history item based on its type
  const renderHistoryItem = (item: HistoryItem) => {
    const time = new Date(item.timestamp).toLocaleTimeString();

    switch (item.type) {
      case "task": {
        const taskItem = item as TaskHistoryItem;
        return (
          <div className="flex items-center justify-between py-1 group">
            <div className="flex items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 w-16">{time}</span>
              <span className="ml-2">
                <span className="text-green-600 dark:text-green-400">✓</span> {taskItem.text}
              </span>
            </div>
            <button
              onClick={() => handleDeleteItem(item.id)}
              className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete"
              type="button"
            >
              ×
            </button>
          </div>
        );
      }
      case "snapshot": {
        const snapshotItem = item as SnapshotHistoryItem;
        return (
          <div className="flex items-center justify-between py-1 group">
            <div className="flex items-center">
              <span
                className="ml-2 cursor-pointer text-gray-500 dark:text-gray-400"
                onClick={() => handleViewSnapshot(snapshotItem)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleViewSnapshot(snapshotItem);
                  }
                }}
              >
                {snapshotItem.title}
              </span>
            </div>
          </div>
        );
      }
    }
  };

  const sortedDates = Object.keys(historyByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // renderHistoryItems 関数を修正
  const renderHistoryItems = (date: string, items: HistoryItem[]) => {
    const itemsByType = groupItemsByType(items);
    const types = Object.keys(itemsByType);

    return (
      <div key={date} className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{formatDate(date)}</h2>

        {types.map((type) => {
          const typeItems = itemsByType[type];
          const isExpanded = expandedTypes[type] || false;
          const limit = 3; // 初期表示数
          const displayItems = isExpanded ? typeItems : typeItems.slice(0, limit);

          return (
            <div key={type} className="mb-4">
              <div className="flex items-center mb-1">
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 capitalize">
                  {type === "task" ? "Completed Tasks" : type === "snapshot" ? "Snapshots" : type}
                </h3>
                {type === "snapshot" && (
                  <button
                    onClick={handleCompareSnapshots}
                    className="ml-2 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    type="button"
                  >
                    Compare
                  </button>
                )}
              </div>
              <div className="space-y-1 pl-4">
                {typeItems.length > 0 ? (
                  <>
                    {displayItems.map((item) => (
                      <div key={item.id}>{renderHistoryItem(item)}</div>
                    ))}
                    {typeItems.length > limit && (
                      <button
                        onClick={() => toggleTypeExpansion(type)}
                        className="mt-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none"
                        type="button"
                      >
                        {isExpanded ? `Show less` : `Show ${typeItems.length - limit} more...`}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 italic">
                    No {type === "task" ? "completed tasks" : type === "edit" ? "edits" : "snapshots"} on this day.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-gray-900 dark:text-gray-100">History</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setPurgeType("all");
                    setShowPurgeConfirm(true);
                  }}
                  className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-red-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-gray-600 transition-colors focus:outline-none"
                  type="button"
                >
                  Delete All
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="w-full sm:w-auto">
                <label htmlFor="year-filter" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Year
                </label>
                <select
                  id="year-filter"
                  value={filter.year || ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : undefined;
                    updateFilter("year", value);
                  }}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <label htmlFor="month-filter" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Month
                </label>
                <select
                  id="month-filter"
                  value={filter.month || ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : undefined;
                    updateFilter("month", value);
                  }}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Months</option>
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1, 1).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <label htmlFor="day-filter" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Day
                </label>
                <select
                  id="day-filter"
                  value={filter.day || ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : undefined;
                    updateFilter("day", value);
                  }}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Days</option>
                  {availableDays.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <label htmlFor="type-filter" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Type
                </label>
                <select
                  id="type-filter"
                  value={filter.types ? filter.types[0] : ""}
                  onChange={(e) => {
                    const value = e.target.value as HistoryItemType;
                    updateFilter("types", value ? [value] : undefined);
                  }}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-1.5 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="task">Tasks</option>
                  <option value="snapshot">Snapshots</option>
                </select>
              </div>

              <div className="w-full sm:w-auto sm:ml-auto sm:self-end">
                <button
                  onClick={resetFilters}
                  className="w-full sm:w-auto px-3 py-1.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none"
                  type="button"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {sortedDates.length === 0 ? (
            <div className="text-center py-12 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">Snapshots and Completed tasks are empty.</p>
              {Object.keys(filter).length > 0 && (
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Try adjusting your filters or{" "}
                  <button onClick={resetFilters} className="text-blue-500 hover:underline" type="button">
                    reset them
                  </button>
                  .
                </p>
              )}
            </div>
          ) : (
            <div className="dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="font-mono text-sm p-4 h-[60vh] overflow-auto whitespace-pre-wrap">
                {sortedDates.map((date) => {
                  // 日付ごとのアイテムを取得
                  const items = historyByDate[date];
                  return renderHistoryItems(date, items);
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Confirm Clear History</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {purgeType === "all"
                ? "Are you sure you want to clear all history? This action cannot be undone."
                : `Are you sure you want to clear all ${purgeType} history? This action cannot be undone.`}
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
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Comparison Dialog */}
      <SnapshotDiff isOpen={diffDialogOpen} onClose={() => setDiffDialogOpen(false)} />

      {/* Snapshot Viewer */}
      <SnapshotViewer isOpen={viewerOpen} onClose={() => setViewerOpen(false)} snapshot={selectedSnapshot} />

      <Footer pageName="History" />
    </div>
  );
};
