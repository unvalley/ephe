"use client";

import { Link } from "react-router-dom";
import { memo, useState, useEffect, useRef } from "react";
import { useTheme } from "../hooks/use-theme";
import Avatar from "boring-avatars";
import { SuccessIcon } from "./icons";

type FooterProps = {
  charCount?: number;
  taskCount?: {
    open: number;
    closed: number;
  };
};

// Days feature component
const DaysDisplay = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const currentYear = new Date().getFullYear();
  const today = new Date();

  // Format current date based on user's locale
  const formattedToday = today.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Calculate the number of days in the current year
  const daysInYear = new Date(currentYear, 11, 31).getDate() === 31 ? 365 : 366;
  //   const daysInMonth = new Date(currentYear, today.getMonth(), 0).getDate();

  // Generate array of all days in the current year
  const daysArray = Array.from({ length: daysInYear }, (_, i) => {
    const date = new Date(currentYear, 0, i + 1);
    return {
      date,
      current: isSameDay(date, today),
      past: date < today && !isSameDay(date, today),
      future: date > today,
    };
  });

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        className="whitespace-nowrap flex items-center gap-0.5 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded hover:text-gray-900 dark:hover:text-gray-100 font-mono text-sm"
      >
        {formattedToday}
      </button>

      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 transform bg-white dark:bg-gray-900 p-10 shadow-xl rounded-xl"
          style={{
            maxWidth: "450px",
            maxHeight: "650px",
            overflow: "hidden",
          }}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div
            className="grid mx-auto"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(15, 1fr)",
              gridTemplateRows: "repeat(auto-fill, 1fr)",
              columnGap: "18px",
              rowGap: "18px",
              justifyItems: "center",
              padding: "20px",
            }}
          >
            {daysArray.map((day) => (
              <div
                key={formatDate(day.date)}
                className="cursor-pointer relative group hover:scale-150 hover:z-10"
                style={{
                  width: "5px",
                  height: "5px",
                  background: day.past || day.current ? (isDark ? "white" : "#333333") : isDark ? "#444444" : "#dddddd",
                  borderRadius: "50%",
                  transition: "transform 0.2s, background-color 0.2s",
                }}
                onMouseEnter={() => setHoveredDay(formatDate(day.date))}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 transform mb-1 px-1 py-1 bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-100 text-xs rounded whitespace-nowrap transition-all duration-300 ease-out ${
                    hoveredDay === formatDate(day.date)
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-2 scale-95 pointer-events-none"
                  }`}
                >
                  {formatDate(day.date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const EPHE_VERSION = "0.0.1";

const _Footer = ({ charCount = 0, taskCount }: FooterProps) => {
  const { toggleTheme, toggleTargetTheme } = useTheme();

  // Safe access to task counts with defaults
  const openTasks = taskCount?.open ?? 0;
  const closedTasks = taskCount?.closed ?? 0;
  const totalTasks = openTasks + closedTasks;

  // Check if all tasks are completed (only if there are tasks)
  const hasTasks = totalTasks > 0;
  const allTasksCompleted = hasTasks && openTasks === 0;

  return (
    <footer className="fixed inset-x-0 bottom-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm space-mono">
      <div className="mx-auto px-2 py-1 text-s dark:text-gray-400 flex items-center justify-between">
        <nav className="flex gap-4 items-center">
          <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-100">
            Home
          </Link>
          <Link to="/history" className={"hover:text-gray-900 dark:hover:text-gray-100"}>
            History
          </Link>
        </nav>

        <div className="flex items-center space-x-3 min-w-0">
          <DaysDisplay />

          <span
            className={`whitespace-nowrap flex items-center gap-0.5 px-2 py-0.5 rounded ${
              allTasksCompleted
                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-50 dark:bg-gray-700"
            }`}
          >
            {allTasksCompleted && closedTasks > 0 && (
              <span className="px-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-full flex items-center">
                <SuccessIcon />
              </span>
            )}
            {hasTasks ? (
              <span>
                {closedTasks}/{totalTasks}
              </span>
            ) : (
              <span>0</span>
            )}
            <span className="ml-0.5">tasks</span>
          </span>
          <span className="whitespace-nowrap flex items-center gap-0.5 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded">
            {charCount.toLocaleString()} chars
          </span>
          <div className="flex items-center">
            <Avatar
              size={12}
              name="Georgia O"
              colors={["#6c788e", "#a6aec1", "#cfd5e1", "#ededf2", "#fcfdff"]}
              variant="marble"
              className="flex-shrink-0 mr-1"
            />
            <Link to="/landing" className="hover:text-gray-900 dark:hover:text-gray-100 whitespace-nowrap">
              Ephe v{EPHE_VERSION}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const Footer = memo(_Footer);

// Helper function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Format date as YYYY/MM/DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}/${month}/${day}`;
};
