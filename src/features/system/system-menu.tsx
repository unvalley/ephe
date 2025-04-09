"use client";

import { useTheme } from "../../hooks/use-theme";
import { MoonIcon, SunIcon, TableOfContentsIcon, WidthIcon, SuccessIcon } from "../../components/icons";
import { usePaperMode } from "../../hooks/use-paper-mode";
import { useEditorWidth } from "../../hooks/use-editor-width";
import { useToc } from "../../hooks/use-toc";
import { useCharCount } from "../../hooks/use-char-count";
import { useState, useEffect } from "react";
import { getTasksByDate } from "../tasks/task-storage";

// REFACTOR
const useTodayCompletedTasks = () => {
  const [todayCompletedTasks, setTodayCompletedTasks] = useState(0);

  useEffect(() => {
    const loadTodayTasks = () => {
      const today = new Date();
      const tasksByDate = getTasksByDate({
        year: today.getFullYear(),
        month: today.getMonth() + 1, // getMonth is 0-indexed
        day: today.getDate()
      });
      
      // Count tasks completed today
      const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const todayTasks = tasksByDate[todayDateStr] || [];
      setTodayCompletedTasks(todayTasks.length);
    };  

    loadTodayTasks();

    // Set up event listener for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.includes("completed-tasks")) {
        loadTodayTasks();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return { todayCompletedTasks, setTodayCompletedTasks };
};
  

export const SystemMenu = () => {
  const { nextTheme, setTheme, isDarkMode } = useTheme();
  const { paperMode, toggleGraphMode, toggleDotsMode, toggleNormalMode } = usePaperMode();
  const { isVisibleToc, toggleToc } = useToc();
  const { editorWidth, setNormalWidth, setWideWidth } = useEditorWidth();
  const { charCount } = useCharCount();
  const { todayCompletedTasks } = useTodayCompletedTasks();

  return (
    <div
      id="system-menu-container"
      className="bg-mono-50 dark:bg-mono-700 z-10 w-56 divide-y divide-mono-100 dark:divide-mono-500 rounded-md ring-1 shadow-lg ring-black/5 dark:ring-white/10 ring-opacity-5 focus:outline-none"
    >
        <SystemMenuSection title="Document Stats">
          <div className="px-4 py-2.5 text-sm flex items-center">
            <span className="flex items-center justify-center w-5 h-5 mr-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5H20V7H4V5Z" fill="currentColor" />
                <path d="M4 9H20V11H4V9Z" fill="currentColor" />
                <path d="M4 13H14V15H4V13Z" fill="currentColor" />
                <path d="M4 17H11V19H4V17Z" fill="currentColor" />
              </svg>
            </span>
            <span>{charCount > 0 ? `${charCount.toLocaleString()} characters` : "No content"}</span>
          </div>
          <div className="px-4 py-2.5 text-sm flex items-center">
            <span className="flex items-center justify-center w-5 h-5 mr-3">
              {todayCompletedTasks > 0 ? (
                <SuccessIcon />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                </svg>
              )}
            </span>
            <span className={todayCompletedTasks > 0 ? "text-green-700 dark:text-green-400" : ""}>
              {todayCompletedTasks > 0 ? `${todayCompletedTasks} closed today` : "No closed today"}
            </span>
          </div>
        </SystemMenuSection>

      <SystemMenuSection title="System">
        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          className={`flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </span>
          <span>{isDarkMode ? "Light mode" : "Dark mode"}</span>
        </button>

        <button
          type="button"
          onClick={toggleToc}
          className={`flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <TableOfContentsIcon />
          </span>
          <span>{isVisibleToc ? "Hide ToC" : "Show ToC"}</span>
        </button>
      </SystemMenuSection>

      <SystemMenuSection title="Paper Mode">
        <button
          type="button"
          onClick={toggleNormalMode}
          className={`${
            paperMode === "normal" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
          } flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <span className="w-4 h-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"></span>
          </span>
          <span>Normal</span>
        </button>
        <button
          type="button"
          onClick={toggleGraphMode}
          className={`${
            paperMode === "graph" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
          } flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <span className="w-4 h-4 border border-gray-300 dark:border-gray-600 grid grid-cols-3 opacity-70">
              <span
                className="col-span-3 border-b border-gray-400 dark:border-gray-500"
                style={{ height: "33%" }}
              ></span>
              <span
                className="col-span-3 border-b border-gray-400 dark:border-gray-500"
                style={{ height: "66%" }}
              ></span>
            </span>
          </span>
          <span>Graph</span>
        </button>

        <button
          type="button"
          onClick={toggleDotsMode}
          className={`${
            paperMode === "dots" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
          } flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <span className="w-4 h-4 border border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span>
            </span>
          </span>
          <span>Dots</span>
        </button>
      </SystemMenuSection>

      <SystemMenuSection title="Editor Width">
        <button
          type="button"
          onClick={setNormalWidth}
          className={`${
            editorWidth === "normal" ? "font-semibold bg-gray-100 dark:bg-gray-700/50" : ""
          } flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <WidthIcon />
          </span>
          <span>Normal</span>
        </button>
        <button
          type="button"
          onClick={setWideWidth}
          className={`${
            editorWidth === "wide" ? "font-semibold bg-gray-100 dark:bg-gray-700/50" : ""
          } flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <WidthIcon />
          </span>
          <span>Wide</span>
        </button>
      </SystemMenuSection>

    </div>
  );
};

const SystemMenuSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <div className="py-1">
      <div className="px-3 py-2 text-xs text-mono-400 dark:text-mono-300">{title}</div>
      {children}
    </div>
  );
};
