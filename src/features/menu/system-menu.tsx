"use client";

import { useTheme } from "../../utils/hooks/use-theme";
import { usePaperMode } from "../../utils/hooks/use-paper-mode";
import { useEditorWidth } from "../../utils/hooks/use-editor-width";
import { useCharCount } from "../../utils/hooks/use-char-count";
import { useState, useEffect, useRef } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { COLOR_THEME } from "../../utils/theme-initializer";
import {
  CheckCircleIcon,
  DocumentIcon,
  HashtagIcon,
  ViewColumnsIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { taskStorage } from "../editor/tasks/task-storage";
import { HistoryModal } from "../history/history-modal";
import { snapshotStorage } from "../snapshots/snapshot-storage";
import { useTaskAutoFlush } from "../../utils/hooks/use-task-auto-flush";

// Today completed tasks count
const useTodayCompletedTasks = (menuOpen: boolean) => {
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
  }, [menuOpen]);
  return { todayCompletedTasks };
};

// All snapshots count
const useSnapshotCount = (menuOpen: boolean) => {
  const [snapshotCount, setSnapshotCount] = useState(0);
  useEffect(() => {
    const loadSnapshots = () => {
      const snapshots = snapshotStorage.getAll();
      setSnapshotCount(snapshots.length);
    };
    loadSnapshots();
  }, [menuOpen]);
  return { snapshotCount };
};

// const tocVisibilityAtom = atomWithStorage<boolean>(LOCAL_STORAGE_KEYS.TOC_MODE, false);

const useHistoryModal = () => {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [modalTabIndex, setModalTabIndex] = useState(0);
  return { historyModalOpen, modalTabIndex, setHistoryModalOpen, setModalTabIndex };
};

export const SystemMenu = () => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { historyModalOpen, modalTabIndex, setHistoryModalOpen, setModalTabIndex } = useHistoryModal();

  const { theme, setTheme } = useTheme();
  const { paperMode, cyclePaperMode } = usePaperMode();

  const { editorWidth, setNormalWidth, setWideWidth } = useEditorWidth();
  const { charCount } = useCharCount();
  const { todayCompletedTasks } = useTodayCompletedTasks(menuOpen);
  const { snapshotCount } = useSnapshotCount(menuOpen);
  const { taskAutoFlushMode, setTaskAutoFlushMode } = useTaskAutoFlush();

  const openTaskSnapshotModal = (tabIndex: number) => {
    setModalTabIndex(tabIndex);
    setHistoryModalOpen(true);
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && menuOpen) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <>
      <Menu as="div" className="relative" ref={menuRef}>
        {({ open }) => (
          <>
            <MenuButton
              className="rounded-md bg-white px-2 py-1 transition-colors hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              System
            </MenuButton>

            {(open || menuOpen) && (
              <MenuItems
                className="absolute bottom-full left-0 z-10 mb-2 w-48 overflow-hidden rounded-md bg-white shadow-md focus:outline-none dark:bg-primary-700"
                portal={false}
                static
              >
                {/* Document Stats Section */}
                <div className="py-1">
                  <div className="px-3 py-2 text-primary-400 text-xs dark:text-primary-300">Document Stats</div>
                  <MenuItem disabled>
                    <div className="flex items-center px-4 py-2.5 text-sm data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30">
                      <span className="mr-3 flex h-5 w-5 items-center justify-center">
                        <HashtagIcon className="size-4 stroke-1" />
                      </span>
                      <span>{charCount > 0 ? `${charCount.toLocaleString()} chars` : "No content"}</span>
                    </div>
                  </MenuItem>

                  <MenuItem as="div">
                    <button
                      type="button"
                      className="flex w-full items-center px-4 py-2.5 text-sm hover:bg-neutral-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-neutral-700/70"
                      onClick={() => openTaskSnapshotModal(0)}
                    >
                      <span className="mr-3 flex h-5 w-5 items-center justify-center">
                        {todayCompletedTasks > 0 ? (
                          <CheckCircleIcon className="size-4 stroke-2 text-green-600" />
                        ) : (
                          <CheckCircleIcon className="size-4 stroke-2" />
                        )}
                      </span>
                      <span className={todayCompletedTasks > 0 ? "text-green-600 dark:text-green-400" : ""}>
                        {todayCompletedTasks > 0 ? `${todayCompletedTasks} closed today` : "No closed today"}
                      </span>
                    </button>
                  </MenuItem>

                  <MenuItem as="div">
                    <button
                      type="button"
                      className="flex w-full items-center px-4 py-2.5 text-sm hover:bg-neutral-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-neutral-700/70"
                      onClick={() => openTaskSnapshotModal(1)}
                    >
                      <span className="mr-3 flex h-5 w-5 items-center justify-center">
                        <DocumentIcon className="size-4 stroke-1" />
                      </span>
                      <span>{snapshotCount > 0 ? `${snapshotCount} snapshots` : "No snapshots"}</span>
                    </button>
                  </MenuItem>
                </div>

                <div className="py-1">
                  <div className="px-3 py-2 text-primary-400 text-xs dark:text-primary-300">Appearence</div>
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
                      className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-neutral-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-neutral-700/70"
                    >
                      <span className="mr-3 flex h-5 w-5 items-center justify-center">
                        {theme === COLOR_THEME.LIGHT ? (
                          <SunIcon className="size-4 stroke-1" />
                        ) : theme === COLOR_THEME.DARK ? (
                          <MoonIcon className="size-4 stroke-1" />
                        ) : (
                          <ComputerDesktopIcon className="size-4 stroke-1" />
                        )}
                      </span>
                      <span className="capitalize">{theme} Mode</span>
                    </button>
                  </MenuItem>

                  <MenuItem as="div">
                    <button
                      type="button"
                      onClick={cyclePaperMode}
                      className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-neutral-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-neutral-700/70"
                    >
                      <span className="mr-3 flex h-5 w-5 items-center justify-center">
                        {paperMode === "normal" ? (
                          <span className="h-4 w-4 border border-neutral-500 dark:border-neutral-600" />
                        ) : paperMode === "graph" ? (
                          <span className="grid h-4 w-4 grid-cols-3 border border-neutral-500 opacity-70 dark:border-neutral-600">
                            <span
                              className="col-span-3 border-neutral-500 border-b dark:border-neutral-500"
                              style={{ height: "33%" }}
                            />
                            <span
                              className="col-span-3 border-neutral-500 border-b dark:border-neutral-500"
                              style={{ height: "66%" }}
                            />
                          </span>
                        ) : (
                          <span className="flex h-4 w-4 items-center justify-center border border-neutral-500 dark:border-neutral-600">
                            <span className="h-1 w-1 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                          </span>
                        )}
                      </span>
                      <span className="capitalize">{paperMode} Paper</span>
                    </button>
                  </MenuItem>
                  <MenuItem as="div">
                    <button
                      type="button"
                      onClick={() => {
                        editorWidth === "normal" ? setWideWidth() : setNormalWidth();
                      }}
                      className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-neutral-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-neutral-700/70"
                    >
                      <span className="mr-3 flex h-5 w-5 items-center justify-center">
                        <ViewColumnsIcon className="size-4 stroke-1" />
                      </span>
                      <span className="capitalize">{editorWidth} Width</span>
                    </button>
                  </MenuItem>
                </div>

                <div className="py-1">
                  <div className="px-3 py-2 text-primary-400 text-xs dark:text-primary-300">Task</div>
                  <MenuItem as="div">
                    <button
                      type="button"
                      onClick={() => {
                        setTaskAutoFlushMode((prevMode) => (prevMode === "off" ? "instant" : "off"));
                      }}
                      className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-neutral-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-neutral-700/70"
                    >
                      <span className="mr-3 flex h-5 w-5 items-center justify-center">
                        <BoltIcon className={`size-4 stroke-1`} />
                      </span>
                      <span className={"capitalize"}>Task Flush: {taskAutoFlushMode}</span>
                    </button>
                  </MenuItem>
                </div>
              </MenuItems>
            )}
          </>
        )}
      </Menu>

      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        initialTabIndex={modalTabIndex}
      />
    </>
  );
};
