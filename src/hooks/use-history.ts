import { useState, useEffect } from "react";
import { getHistoryItemsByDate, deleteHistoryItem } from "../features/history/history-storage";
import type { HistoryItem, HistoryItemType } from "../features/history/history-types";

type DateFilter = {
  year?: number;
  month?: number;
  day?: number;
  types?: HistoryItemType[];
};

export function useHistory() {
  const [historyByDate, setHistoryByDate] = useState<Record<string, HistoryItem[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<DateFilter>({});
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);
  const [availableDays, setAvailableDays] = useState<number[]>([]);

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

  return {
    historyByDate,
    isLoading,
    filter,
    availableYears,
    availableMonths,
    availableDays,
    handleDeleteItem,
    resetFilters,
    updateFilter,
  };
} 