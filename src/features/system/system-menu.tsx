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
        day: today.getDate(),
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
  const [isEditorThemeDialogOpen, setIsEditorThemeDialogOpen] = useState(false);

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

        <button
          type="button"
          onClick={() => setIsEditorThemeDialogOpen(true)}
          className={`flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3ZM12 19C8.13 19 5 15.87 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19Z" fill="currentColor" />
              <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" fill="currentColor" />
            </svg>
          </span>
          <span>Editor Theme</span>
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

      {isEditorThemeDialogOpen && <EditorThemeDialog onClose={() => setIsEditorThemeDialogOpen(false)} />}
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

interface EditorThemeDialogProps {
  onClose: () => void;
}

const EDITOR_THEMES = [
  { id: "vs", name: "Light", description: "Default light theme" },
  { id: "vs-dark", name: "Dark", description: "Default dark theme" },
  { id: "ephe-light", name: "Ephe Light", description: "Custom light theme for Ephe" },
  { id: "ephe-dark", name: "Ephe Dark", description: "Custom dark theme for Ephe" },
  { id: "man-city-light", name: "Man City Light", description: "Manchester City light theme" },
  { id: "man-city-dark", name: "Man City Dark", description: "Manchester City dark theme" },
  { id: "hc-black", name: "High Contrast Dark", description: "High contrast dark theme" },
  { id: "hc-light", name: "High Contrast Light", description: "High contrast light theme" },
  { id: "github-light", name: "GitHub Light", description: "GitHub light theme" },
  { id: "github-dark", name: "GitHub Dark", description: "GitHub dark theme" },
] as const;

const EditorThemeDialog = ({ onClose }: EditorThemeDialogProps) => {
  const [selectedTheme, setSelectedTheme] = useState(() => {
    // Get currently selected theme from localStorage or default to vs/vs-dark based on system preference
    return localStorage.getItem("editor-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "vs");
  });

  const applyTheme = (themeId: string) => {
    // Save selected theme to localStorage
    localStorage.setItem("editor-theme", themeId);
    // Publish an event that the editor can listen to
    window.dispatchEvent(new CustomEvent("editor-theme-changed", { detail: { theme: themeId } }));
    setSelectedTheme(themeId);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* Dialog positioning */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Dialog panel */}
        <div className="inline-block align-bottom bg-white dark:bg-mono-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-mono-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">
                  Select Editor Theme
                </h3>
                <div className="mt-4 space-y-2">
                  {EDITOR_THEMES.map((theme) => (
                    <div
                      key={theme.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors flex items-center ${
                        selectedTheme === theme.id
                          ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent"
                      }`}
                      onClick={() => applyTheme(theme.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{theme.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{theme.description}</div>
                      </div>
                      {selectedTheme === theme.id && (
                        <div className="text-primary-500 dark:text-primary-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-mono-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
