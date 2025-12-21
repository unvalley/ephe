"use client";

import { useTheme } from "../../utils/hooks/use-theme";
import { usePaperMode } from "../../utils/hooks/use-paper-mode";
import { useEditorWidth } from "../../utils/hooks/use-editor-width";
import { useCharCount } from "../../utils/hooks/use-char-count";
import { useWordCount } from "../../utils/hooks/use-word-count";
import { useFontFamily, FONT_FAMILY_OPTIONS, FONT_FAMILIES } from "../../utils/hooks/use-font";
import { useEditorMode } from "../../utils/hooks/use-editor-mode";
import { useState, useEffect, useRef } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { COLOR_THEME } from "../../utils/theme-initializer";
import {
  CheckCircleIcon,
  HashIcon,
  SunIcon,
  MoonIcon,
  DesktopIcon,
  LightningIcon,
  ArrowsHorizontalIcon,
  TextAaIcon,
  NotebookIcon,
  FloppyDiskIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { taskStorage } from "../editor/tasks/task-storage";
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

type SystemMenuProps = {
  onOpenHistoryModal?: (tabIndex: number) => void;
};

export const SystemMenu = ({ onOpenHistoryModal }: SystemMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { theme, setTheme } = useTheme();
  const { paperMode, cyclePaperMode } = usePaperMode();
  const { fontFamily, setFontFamily } = useFontFamily();
  const { editorMode, toggleEditorMode } = useEditorMode();

  const { editorWidth, setNormalWidth, setWideWidth } = useEditorWidth();
  const { charCount } = useCharCount();
  const { wordCount } = useWordCount();
  const { todayCompletedTasks } = useTodayCompletedTasks(menuOpen);
  const { snapshotCount } = useSnapshotCount(menuOpen);
  const { taskAutoFlushMode, setTaskAutoFlushMode } = useTaskAutoFlush();

  const openTaskSnapshotModal = (tabIndex: number) => {
    if (!onOpenHistoryModal) return;
    setMenuOpen(false);
    onOpenHistoryModal(tabIndex);
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
    <Menu as="div" className="relative" ref={menuRef}>
      {({ open }) => (
        <>
          <MenuButton
            className="select-none rounded-md bg-white px-2 py-1 text-neutral-900 transition-colors hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            System
          </MenuButton>

          {(open || menuOpen) && (
            <MenuItems
              className="absolute bottom-full left-0 z-10 mb-2 w-48 select-none overflow-hidden rounded-md bg-white text-neutral-900 shadow-md focus:outline-none dark:bg-primary-700 dark:text-neutral-100"
              portal={false}
              static
            >
              {/* Document Stats Section */}
              <div className="py-1">
                <div className="px-3 py-2 text-primary-400 text-xs dark:text-primary-300">Document Stats</div>
                <MenuItem disabled>
                  <div className="flex items-center px-4 py-2.5 text-sm data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30">
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      <HashIcon className="size-4" weight="light" />
                    </span>
                    <span>{charCount > 0 ? `${charCount.toLocaleString()} chars` : "No content"}</span>
                  </div>
                </MenuItem>

                <MenuItem disabled>
                  <div className="flex items-center px-4 py-2.5 text-sm data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30">
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      <HashIcon className="size-4" weight="light" />
                    </span>
                    <span>{wordCount > 0 ? `${wordCount.toLocaleString()} words` : "No content"}</span>
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
                        <CheckCircleIcon className="size-4 text-green-600" weight="light" />
                      ) : (
                        <CheckCircleIcon className="size-4" weight="light" />
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
                      <FloppyDiskIcon className="size-4" weight="light" />
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
                        <SunIcon className="size-4" weight="light" />
                      ) : theme === COLOR_THEME.DARK ? (
                        <MoonIcon className="size-4" weight="light" />
                      ) : (
                        <DesktopIcon className="size-4" weight="light" />
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
                      <NotebookIcon className="size-4" weight="light" />
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
                      <ArrowsHorizontalIcon className="size-4" weight="light" />
                    </span>
                    <span className="capitalize">{editorWidth} Width</span>
                  </button>
                </MenuItem>
                <MenuItem as="div">
                  <button
                    type="button"
                    onClick={() => {
                      const fontKeys = FONT_FAMILY_OPTIONS;
                      const currentIndex = fontKeys.indexOf(fontFamily);
                      const nextIndex = (currentIndex + 1) % fontKeys.length;
                      setFontFamily(fontKeys[nextIndex]);
                    }}
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-neutral-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-neutral-700/70"
                  >
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      <TextAaIcon className="size-4" weight="light" />
                    </span>
                    <span className="capitalize">{FONT_FAMILIES[fontFamily].displayValue}</span>
                  </button>
                </MenuItem>
                <MenuItem as="div">
                  <button
                    type="button"
                    onClick={toggleEditorMode}
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-neutral-50 data-[focus]:bg-primary-50 dark:data-[focus]:bg-primary-900/30 dark:hover:bg-neutral-700/70"
                  >
                    <span className="mr-3 flex h-5 w-5 items-center justify-center">
                      <SquaresFourIcon className="size-4" weight="light" />
                    </span>
                    <span className="capitalize">{editorMode} Editor</span>
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
                      <LightningIcon className={"size-4"} weight="light" />
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
  );
};
