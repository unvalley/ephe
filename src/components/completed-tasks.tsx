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

    // Extract unique years, months, and days from all tasks
    const years = new Set<number>();
    const months = new Set<number>();
    const days = new Set<number>();

    for (const dateStr of Object.keys(allTasks)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      years.add(year);
      months.add(month);
      days.add(day);
    }

    setAvailableYears(Array.from(years).sort((a, b) => b - a));
    setAvailableMonths(Array.from(months).sort((a, b) => a - b));
    setAvailableDays(Array.from(days).sort((a, b) => a - b));
  }, []);

  // Apply filters when they change
  useEffect(() => {
    setTasksByDate(getTasksByDate(filter));
  }, [filter]);

  // Update a specific filter
  const updateFilter = (key: keyof DateFilter, value: number | string | undefined) => {
    setFilter((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilter({});
  };

  // Handle deleting a task
  const handleDeleteTask = (taskId: string) => {
    deleteCompletedTask(taskId);
    // Refresh tasks with current filter
    setTasksByDate(getTasksByDate(filter));
  };

  // Handle purging all tasks
  const handlePurgeAllTasks = () => {
    purgeCompletedTasks();
    setTasksByDate({});
    setShowPurgeConfirm(false);
  };

  // Format date for display
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

  // Get sorted dates
  const sortedDates = Object.keys(tasksByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // Group tasks by section for a specific date
  const renderTasksBySection = (date: string, tasks: CompletedTask[]) => {
    // Group tasks by section
    const tasksBySection: Record<string, CompletedTask[]> = {};

    // Add "No Section" group for tasks without a section
    tasksBySection["No Section"] = [];

    for (const task of tasks) {
      const section = task.section || "No Section";
      if (!tasksBySection[section]) {
        tasksBySection[section] = [];
      }
      tasksBySection[section].push(task);
    }

    // Sort sections alphabetically, but keep "No Section" at the end
    const sortedSections = Object.keys(tasksBySection).sort((a, b) => {
      if (a === "No Section") return 1;
      if (b === "No Section") return -1;
      return a.localeCompare(b);
    });

    return (
      <div
        key={date}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">{formatDate(date)}</h3>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedSections.map((section) => {
            const sectionTasks = tasksBySection[section];
            if (sectionTasks.length === 0) return null;

            return (
              <div key={section} className="p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">{section}</h4>
                <ul className="space-y-2">
                  {sectionTasks.map((task) => (
                    <li key={task.id} className="flex items-start group">
                      <div className="flex-1 break-words">
                        <div className="flex items-start">
                          <span className="inline-block mr-2 text-green-500 opacity-80">- [x]</span>
                          <div>
                            <span className="text-gray-700 dark:text-gray-300 opacity-80">{task.content}</span>

                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Completed at {new Date(task.completedAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete task"
                        type="button"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <title>Delete task</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Completed Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your completed tasks. Tasks are automatically saved when checked off in the editor.
          </p>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => {
                setShowPurgeConfirm(true);
              }}
              className="px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors"
              type="button"
            >
              Delete All
            </button>
          </div>
        </div>

        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
              <select
                value={filter.year || ""}
                onChange={(e) => updateFilter("year", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
              <select
                value={filter.month || ""}
                onChange={(e) => updateFilter("month", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Months</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {new Date(0, month - 1).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day</label>
              <select
                value={filter.day || ""}
                onChange={(e) => updateFilter("day", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Days</option>
                {availableDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={resetFilters}
              className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
              type="button"
            >
              Reset Filters
            </button>
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
          <div className="space-y-6">{sortedDates.map((date) => renderTasksBySection(date, tasksByDate[date]))}</div>
        )}
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

      <Footer />
    </div>
  );
};
