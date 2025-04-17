"use client";

import { useTheme } from "../../utils/hooks/use-theme";
import { MoonIcon, SunIcon, TableOfContentsIcon, WidthIcon, SuccessIcon } from "../../utils/components/icons";
import { usePaperMode } from "../../utils/hooks/use-paper-mode";
import { useEditorWidth } from "../../utils/hooks/use-editor-width";
import { useCharCount } from "../../utils/hooks/use-char-count";
import { useState, useEffect, useRef, useCallback } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Link } from "react-router-dom";
import { COLOR_THEME } from "../../utils/theme-initializer";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { taskStorage } from "../editor/tasks/task-storage";
import { snapshotStorage } from "../snapshots/snapshot-storage";

const useTodayCompletedTasks = () => {
  const [todayCompletedTasks, setTodayCompletedTasks] = useState(0);

  useEffect(() => {
    const loadTodayTasks = () => {
      const today = new Date();
      const tasksByDate = taskStorage.getByDate({
        year: today.getFullYear(),
        month: today.getMonth() + 1, // getMonth is 0-indexed
        day: today.getDate(),
      });

      // Count tasks completed today
      const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(today.getDate()).padStart(2, "0")}`;
      const todayTasks = tasksByDate[todayDateStr] || [];
      setTodayCompletedTasks(todayTasks.length);
    };

    loadTodayTasks();
  }, []);

  return { todayCompletedTasks };
};

const useSnapshotCount = () => {
  const [snapshotCount, setSnapshotCount] = useState(0);

  useEffect(() => {
    const loadSnapshots = () => {
      const snapshots = snapshotStorage.getAll();
      setSnapshotCount(snapshots.length);
    };

    loadSnapshots();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes("snapshot")) {
        loadSnapshots();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return { snapshotCount };
};

const tocVisibilityAtom = atomWithStorage<boolean>(LOCAL_STORAGE_KEYS.TOC_MODE, false);

export const SystemMenu = () => {
  const { theme, setTheme } = useTheme();
  const { paperMode, toggleGraphMode, toggleDotsMode, toggleNormalMode } = usePaperMode();
  const [isVisibleToc, setIsVisibleToc] = useAtom(tocVisibilityAtom);

  const { editorWidth, setNormalWidth, setWideWidth } = useEditorWidth();
  const { charCount } = useCharCount();
  const { todayCompletedTasks } = useTodayCompletedTasks();
  const { snapshotCount } = useSnapshotCount();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleToc = useCallback(() => {
    setIsVisibleToc((prev) => !prev);
  }, [setIsVisibleToc]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <Menu as="div" className="relative" ref={menuRef}>
      {({ open }) => (
        <>
          <MenuButton
            className="rounded-md px-2 py-1 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => setIsOpen(!isOpen)}
          >
            System
          </MenuButton>

          {(open || isOpen) && (
            <MenuItems
              className="absolute bottom-full left-0 z-10 mb-2 w-56 overflow-hidden rounded-md shadow-md focus:outline-none dark:bg-mono-700"
              portal={false}
              static
            >
              {/* Document Stats Section */}
              <div className="py-1">
                <div className="px-3 py-2 text-mono-400 text-xs dark:text-mono-300">Document Stats</div>
                <MenuItem disabled>
                  <div className="flex items-center px-4 py-2.5 text-sm data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30">
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <title>Characters Icon</title>
                        <path d="M4 5H20V7H4V5Z" fill="currentColor" />
                        <path d="M4 9H20V11H4V9Z" fill="currentColor" />
                        <path d="M4 13H14V15H4V13Z" fill="currentColor" />
                        <path d="M4 17H11V19H4V17Z" fill="currentColor" />
                      </svg>
                    </span>
                    <span>{charCount > 0 ? `${charCount.toLocaleString()} chars` : "No content"}</span>
                  </div>
                </MenuItem>

                <MenuItem as="div">
                  <Link
                    to="/history"
                    className="flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-gray-700/70"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      {todayCompletedTasks > 0 ? (
                        <SuccessIcon />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <title>Checkmark Icon</title>
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor" />
                        </svg>
                      )}
                    </span>
                    <span className={todayCompletedTasks > 0 ? "text-green-700 dark:text-green-400" : ""}>
                      {todayCompletedTasks > 0 ? `${todayCompletedTasks} closed today` : "No closed today"}
                    </span>
                  </Link>
                </MenuItem>

                <MenuItem as="div">
                  <Link
                    to="/history"
                    className="flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-gray-700/70"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        className="size-6"
                      >
                        <title>Snapshots Icon</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                        />
                      </svg>
                    </span>
                    <span>{snapshotCount > 0 ? `${snapshotCount} snapshots` : "No snapshots"}</span>
                  </Link>
                </MenuItem>
              </div>

              <div className="py-1">
                <div className="px-3 py-2 text-mono-400 text-xs dark:text-mono-300">Appearence</div>
                <MenuItem as="div">
                  <button
                    type="button"
                    onClick={() => {
                      // Cycle through theme modes
                      if (theme === COLOR_THEME.LIGHT) {
                        setTheme(COLOR_THEME.DARK);
                      } else if (theme === COLOR_THEME.DARK) {
                        setTheme(COLOR_THEME.SYSTEM);
                      } else {
                        setTheme(COLOR_THEME.LIGHT);
                      }
                    }}
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-gray-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-gray-700/70"
                  >
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      {theme === COLOR_THEME.LIGHT ? (
                        <SunIcon />
                      ) : theme === COLOR_THEME.DARK ? (
                        <MoonIcon />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <title>System Theme Icon</title>
                          <path
                            d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2V4a8 8 0 1 0 0 16z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                    </span>
                    <span>
                      {theme === COLOR_THEME.LIGHT
                        ? "Light mode"
                        : theme === COLOR_THEME.DARK
                          ? "Dark mode"
                          : "System mode"}
                    </span>
                  </button>
                </MenuItem>

                <MenuItem as="div">
                  <button
                    type="button"
                    onClick={toggleToc}
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-gray-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-gray-700/70"
                  >
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      <TableOfContentsIcon />
                    </span>
                    <span>{isVisibleToc ? "Hide ToC" : "Show ToC"}</span>
                  </button>
                </MenuItem>
              </div>

              {/* Paper Mode Section */}
              <div className="py-1">
                <div className="px-3 py-2 text-mono-400 text-xs dark:text-mono-300">Paper Mode</div>
                <MenuItem as="div">
                  <button
                    type="button"
                    onClick={() => {
                      // Cycle through paper modes
                      if (paperMode === "normal") {
                        toggleGraphMode();
                      } else if (paperMode === "graph") {
                        toggleDotsMode();
                      } else {
                        toggleNormalMode();
                      }
                    }}
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-gray-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-gray-700/70"
                  >
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      {paperMode === "normal" ? (
                        <span className="h-4 w-4 border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700" />
                      ) : paperMode === "graph" ? (
                        <span className="grid h-4 w-4 grid-cols-3 border border-gray-300 opacity-70 dark:border-gray-600">
                          <span
                            className="col-span-3 border-gray-400 border-b dark:border-gray-500"
                            style={{ height: "33%" }}
                          />
                          <span
                            className="col-span-3 border-gray-400 border-b dark:border-gray-500"
                            style={{ height: "66%" }}
                          />
                        </span>
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center border border-gray-300 dark:border-gray-600">
                          <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                        </span>
                      )}
                    </span>
                    <span className="capitalize">{paperMode}</span>
                  </button>
                </MenuItem>
              </div>

              {/* Editor Width Section */}
              <div className="py-1">
                <div className="px-3 py-2 text-mono-400 text-xs dark:text-mono-300">Editor Width</div>
                <MenuItem as="div">
                  <button
                    type="button"
                    onClick={() => {
                      // Toggle editor width
                      editorWidth === "normal" ? setWideWidth() : setNormalWidth();
                    }}
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-gray-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-gray-700/70"
                  >
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      <WidthIcon />
                    </span>
                    <span className="capitalize">{editorWidth}</span>
                  </button>
                </MenuItem>
              </div>
            </MenuItems>
          )}
        </>
      )}
    </Menu>
  );
};
