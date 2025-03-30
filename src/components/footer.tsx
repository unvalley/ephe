"use client";

import { Link } from "react-router-dom";
import { memo } from "react";
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

const EPHE_VERSION = "0.0.1";

const _Footer = ({ charCount, taskCount }: FooterProps) => {
  const { toggleTheme, toggleTargetTheme } = useTheme();

  // Safe access to task counts with defaults
  const openTasks = taskCount?.open ?? 0;
  const closedTasks = taskCount?.closed ?? 0;
  const totalTasks = openTasks + closedTasks;

  // Check if all tasks are completed (only if there are tasks)
  const hasTasks = totalTasks > 0;
  const allTasksCompleted = hasTasks && openTasks === 0;

  const hasCharCount = charCount && charCount > 0;

  return (
    <footer className="fixed inset-x-0 bottom-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm space-mono">
      <div className="mx-auto px-2 py-1 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
        <nav className="flex gap-4 items-center">
          <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-100">
            Home
          </Link>
          <Link to="/history" className={"hover:text-gray-900 dark:hover:text-gray-100"}>
            History
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleTheme();
            }}
            className="hover:text-gray-900 dark:hover:text-gray-100"
            aria-label={`Switch to ${toggleTargetTheme} mode`}
          >
            {toggleTargetTheme === "light" ? "Light" : "Dark"}
          </button>
        </nav>

        <div className="flex items-center space-x-3 min-w-0">
          {hasTasks && (
            <span
              className={`whitespace-nowrap flex items-center gap-0.5 px-2 py-0.5 rounded ${
                allTasksCompleted
                  ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {allTasksCompleted && closedTasks > 0 && (
                <span className="px-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-full flex items-center">
                  <SuccessIcon />
                </span>
              )}
              <span>
                {closedTasks}/{totalTasks}
              </span>
              <span className="ml-0.5">tasks</span>
            </span>
          )}
          {hasCharCount && (
            <span className="whitespace-nowrap flex items-center gap-0.5 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded">
              {charCount.toLocaleString()} chars
            </span>
          )}
          <a
            href="https://github.com/unvalley/ephe"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900 dark:hover:text-gray-100 flex items-center"
          >
            GitHub
          </a>
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
