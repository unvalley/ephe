"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../utils/hooks/use-theme";

export const DaysDisplay = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const today = new Date();

  // Format current date based on user's locale
  const formattedToday = today.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Calculate the number of days in the current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Calculate days remaining in current month
  const currentDay = today.getDate();
  const daysRemaining = daysInMonth - currentDay;

  // Generate array of all days in the current month
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(currentYear, currentMonth, i + 1);
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
        className="whitespace-nowrap"
      >
        {formattedToday}
      </button>

      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full mb-2 transform rounded-xl bg-mono-50 p-6 shadow-xl dark:bg-mono-700"
          style={{
            maxWidth: "450px",
            maxHeight: "650px",
            overflow: "hidden",
            transform: "translateX(-30%)",
          }}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="mb-2 text-center text-mono-500 text-sm dark:text-mono-400">
            {daysRemaining > 0 ? `${daysRemaining} days left` : "Last day of the month"}
          </div>
          <div
            className="mx-auto grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gridTemplateRows: "repeat(auto-fill, 1fr)",
              columnGap: "14px",
              rowGap: "14px",
              justifyItems: "center",
              padding: "10px",
            }}
          >
            {daysArray.map((day) => (
              <div
                key={formatDate(day.date)}
                className="group relative hover:z-10 hover:scale-150"
                style={{
                  width: "5px",
                  height: "5px",
                  background:
                    day.past || day.current ? (isDarkMode ? "white" : "#333333") : isDarkMode ? "#444444" : "#dddddd",
                  borderRadius: "50%",
                  transition: "transform 0.2s, background-color 0.2s",
                }}
                onMouseEnter={() => setHoveredDay(formatDate(day.date))}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div
                  className={`-translate-x-1/2 absolute bottom-full left-1/2 mb-1 transform whitespace-nowrap rounded bg-mono-50 text-xs transition-all duration-300 ease-out dark:bg-mono-700 ${
                    hoveredDay === formatDate(day.date)
                      ? "translate-y-0 scale-100 opacity-100"
                      : "pointer-events-none translate-y-2 scale-95 opacity-0"
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
