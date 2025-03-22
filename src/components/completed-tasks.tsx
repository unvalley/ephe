"use client";

import { useState, useEffect } from "react";
import {
  getTasksByDate,
  deleteCompletedTask,
  purgeCompletedTasks,
  type CompletedTask,
} from "../features/tasks/task-storage";
import { Footer } from "./footer";

type DateFilter = {
  year?: number;
  month?: number;
  day?: number;
};

export const CompletedTasksPage = () => {
  const [tasksByDate, setTasksByDate] = useState<Record<string, CompletedTask[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<DateFilter>({});

  // Get available years, months, and days from all tasks
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);
  const [availableDays, setAvailableDays] = useState<number[]>([]);

  // Confirmation modal state
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Load tasks and available filter options
  useEffect(() => {
    const allTasks = getTasksByDate();
    setTasksByDate(allTasks);
    setIsLoading(false);

    // Extract unique years, months, and days from all tasks
    const years = new Set<number>();
    const months = new Set<number>();
    const days = new Set<number>();

    // biome-ignore lint/complexity/noForEach: <explanation>
    Object.keys(allTasks).forEach((dateStr) => {
      // Parse the date string which is now in YYYY-MM-DD format
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
    setTasksByDate(getTasksByDate(filter));
  }, [filter]);

  const handleDeleteTask = (taskId: string) => {
    deleteCompletedTask(taskId);
    // Refresh tasks with current filter
    setTasksByDate(getTasksByDate(filter));
  };

  const formatDate = (dateString: string): string => {
    // dateString is now in YYYY-MM-DD format
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
  const updateFilter = (key: keyof DateFilter, value: number | undefined) => {
    setFilter((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Purge all tasks
  const handlePurgeAllTasks = () => {
    purgeCompletedTasks();
    setTasksByDate({});
    setShowPurgeConfirm(false);
  };

  // タスクをセクションごとにグループ化する関数
  const groupTasksBySection = (tasks: CompletedTask[]): Record<string, CompletedTask[]> => {
    const tasksBySection: Record<string, CompletedTask[]> = {};

    for (const task of tasks) {
      // セクションがない場合は "No Section" として表示
      const section = task.section || "No Section";
      if (!tasksBySection[section]) {
        tasksBySection[section] = [];
      }
      tasksBySection[section].push(task);
    }

    return tasksBySection;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading tasks...</div>
      </div>
    );
  }

  const sortedDates = Object.keys(tasksByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="h-screen w-screen flex flex-col antialiased bg-white dark:bg-gray-900">
      <div className="flex-1 pt-16 pb-8 overflow-auto">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Completed Tasks</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Your completed tasks in the editor.</p>
            </div>

            {/* Purge button */}
            {Object.keys(tasksByDate).length > 0 && (
              <button
                onClick={() => setShowPurgeConfirm(true)}
                className="px-3 py-1.5 text-sm rounded-md bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors focus:outline-none"
                type="button"
              >
                Purge All
              </button>
            )}
          </div>

          {/* Filter controls */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Filter Tasks</h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-full sm:w-auto">
                <label htmlFor="year-filter" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Year
                </label>
                <select
                  id="year-filter"
                  value={filter.year || ""}
                  onChange={(e) => updateFilter("year", e.target.value ? Number(e.target.value) : undefined)}
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
                  onChange={(e) => updateFilter("month", e.target.value ? Number(e.target.value) : undefined)}
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
                  onChange={(e) => updateFilter("day", e.target.value ? Number(e.target.value) : undefined)}
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
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">No completed tasks found.</p>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Editor-like view */}
              <div className="font-mono text-sm p-4 h-[60vh] overflow-auto whitespace-pre-wrap">
                {sortedDates.map((date) => {
                  const tasksBySection = groupTasksBySection(tasksByDate[date]);
                  const sections = Object.keys(tasksBySection);

                  return (
                    <div key={date} className="mb-6">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{formatDate(date)}</h2>

                      {sections.map((section) => (
                        <div key={section} className="mb-4">
                          <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-1">
                            {section === "No Section" ? "Tasks without section" : section}
                          </h3>
                          <div className="space-y-1 pl-4">
                            {tasksBySection[section].map((task) => (
                              <div key={task.id} className="flex group">
                                <div className="flex-1 flex items-start">
                                  <span className="inline-block mr-2 text-green-500 opacity-80">- [x]</span>
                                  <div>
                                    <span className="text-gray-700 dark:text-gray-300 opacity-80">{task.text}</span>

                                    {/* セクション情報は既にグループ化されているので、ここでは表示しない */}
                                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {new Date(task.completedAt).toLocaleTimeString(undefined, {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true,
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400 transition-opacity transition-colors"
                                  aria-label="Delete task"
                                  type="button"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Confirm Deletion</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete all completed tasks? This action cannot be undone.
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
                onClick={handlePurgeAllTasks}
                className="px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors"
                type="button"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer pageName="Completed" />
    </div>
  );
};
