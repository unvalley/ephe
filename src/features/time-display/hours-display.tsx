"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../utils/hooks/use-theme";

export const HoursDisplay = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredHour, setHoveredHour] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();

  const now = new Date();
  const currentHour = now.getHours();

  // Format current time based on user's locale
  //   const formattedTime = now.toLocaleTimeString(undefined, {
  //     hour: "2-digit",
  //     minute: "2-digit",
  //   });

  const formattedToday = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Calculate hours remaining in the day
  const hoursRemaining = 24 - currentHour - 1;
  const minutesRemaining = 60 - now.getMinutes();

  // Generate array of all hours in the day
  const hoursArray = Array.from({ length: 24 }, (_, i) => {
    return {
      hour: i,
      current: i === currentHour,
      past: i < currentHour,
      future: i > currentHour,
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

  // Format hour for display
  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        className="whitespace-nowrap rounded-md bg-white px-2 py-1 transition-colors hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      >
        {formattedToday}
      </button>

      {showTooltip && (
        // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
        <div
          ref={tooltipRef}
          className="absolute bottom-full mb-2 transform rounded-xl bg-primary-50 p-6 shadow-xl dark:bg-primary-700"
          style={{
            maxWidth: "450px",
            maxHeight: "650px",
            overflow: "hidden",
            transform: "translateX(-30%)",
          }}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="mb-2 text-center text-primary-500 text-sm dark:text-primary-400">
            {hoursRemaining > 0 ? `${hoursRemaining}h ${minutesRemaining}m left` : "End of day"}
          </div>
          <div
            className="mx-auto grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gridTemplateRows: "repeat(4, 1fr)",
              columnGap: "14px",
              rowGap: "14px",
              justifyItems: "center",
              padding: "10px",
            }}
          >
            {hoursArray.map((hour) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
              <div
                key={hour.hour}
                className="group relative hover:z-10 hover:scale-150"
                style={{
                  width: "5px",
                  height: "5px",
                  background:
                    hour.past || hour.current ? (isDarkMode ? "white" : "#333333") : isDarkMode ? "#444444" : "#dddddd",
                  borderRadius: "50%",
                  transition: "transform 0.2s, background-color 0.2s",
                }}
                onMouseEnter={() => setHoveredHour(formatHour(hour.hour))}
                onMouseLeave={() => setHoveredHour(null)}
              >
                <div
                  className={`-translate-x-1/2 absolute bottom-full left-1/2 mb-1 transform whitespace-nowrap rounded bg-primary-50 px-1 py-1 text-[12px] transition-all duration-300 ease-out dark:bg-primary-700 ${
                    hoveredHour === formatHour(hour.hour)
                      ? "translate-y-0 scale-100 opacity-100"
                      : "pointer-events-none translate-y-2 scale-95 opacity-0"
                  }`}
                >
                  {formatHour(hour.hour)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
