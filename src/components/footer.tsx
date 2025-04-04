"use client";

import { Link } from "react-router-dom";
import { memo } from "react";
import Avatar from "boring-avatars";
import { SuccessIcon, GearIcon } from "./icons";
// TODO: organize depndency direction, don't import from features
import { SystemMenu } from "../features/system/system-menu";
import { useSystemMenu } from "../features/system/system-context";
import { DaysDisplay } from "./days-display";

type FooterProps = {
  charCount?: number;
  taskCount?: {
    open: number;
    closed: number;
  };
};

const EPHE_VERSION = "0.0.1";

const _Footer = ({ charCount = 0, taskCount }: FooterProps) => {
  const { isSystemMenuOpen, toggleSystemMenu } = useSystemMenu();

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
          <div className="relative">
            <button
              id="system-menu-trigger"
              type="button"
              onClick={toggleSystemMenu}
              className="hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1"
            >
              <GearIcon />
              <span>System</span>
            </button>
            {isSystemMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-50">
                <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden shadow-lg">
                  <SystemMenu />
                </div>
              </div>
            )}
          </div>
          <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-100">
            Editor
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
