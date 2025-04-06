"use client";

import { useTheme } from "../../hooks/use-theme";
import { MoonIcon, SunIcon, TableOfContentsIcon, WidthIcon } from "../../components/icons";
import { usePaperMode } from "../../hooks/use-paper-mode";
import { useToc } from "../toc/toc-context";
import { useEditorWidth } from "../../hooks/use-editor-width";
import { useAutoClearClosedTasks, type AutoClearMode } from "../../hooks/use-auto-clear-closed-tasks";
import { showToast } from "../../components/toast";

export const SystemMenu = () => {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";
  const { paperMode, toggleGraphMode, toggleDotsMode, toggleNormalMode } = usePaperMode();
  const { isTocVisible, toggleToc } = useToc();
  const { editorWidth, setNormalWidth, setWideWidth } = useEditorWidth();
  const { autoClearMode, setAutoClearMode } = useAutoClearClosedTasks();

  const handleAutoClearModeChange = (mode: AutoClearMode) => {
    setAutoClearMode(mode);

    const modeNames = {
      disabled: "Disabled",
      immediate: "Immediate",
      hourly: "After 1 hour",
      daily: "After date change",
    };

    showToast(`Auto Clear Tasks: ${modeNames[mode]}`, "default");
  };

  return (
    <div
      id="system-menu-container"
      className="bg-white dark:bg-gray-800 z-10 w-56 divide-y divide-gray-100 dark:divide-gray-700 rounded-md ring-1 shadow-lg ring-black/5 dark:ring-white/10 ring-opacity-5 focus:outline-none dark:shadow-gray-900/30"
    >
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
        Settings
      </div>

      <div className="py-1">
        <button
          type="button"
          onClick={toggleTheme}
          className="text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150"
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3 text-gray-600 dark:text-gray-300">
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </span>
          <span>{isDarkMode ? "Light mode" : "Dark mode"}</span>
        </button>
      </div>

      <div className="py-1">
        <button
          type="button"
          onClick={toggleToc}
          className={`${isTocVisible ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""} text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3 text-gray-600 dark:text-gray-300">
            <TableOfContentsIcon />
          </span>
          <span>{isTocVisible ? "Hide ToC" : "Show ToC"}</span>
        </button>
      </div>

      <div className="py-1">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Paper Mode</div>
        <button
          type="button"
          onClick={toggleNormalMode}
          className={`${
            paperMode === "normal" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
          } text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
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
          } text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
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
          } text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <span className="w-4 h-4 border border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span>
            </span>
          </span>
          <span>Dots</span>
        </button>
      </div>

      <div className="py-1">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Editor Width</div>
        <button
          type="button"
          onClick={setNormalWidth}
          className={`${
            editorWidth === "normal" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
          } text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
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
            editorWidth === "wide" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
          } text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <WidthIcon />
          </span>
          <span>Wide</span>
        </button>
      </div>

      <div className="py-1">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Auto Clear Tasks</div>
        <button
          type="button"
          onClick={() => handleAutoClearModeChange("disabled")}
          className={`${
            autoClearMode === "disabled" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
          } text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <span className="w-4 h-4 border border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <span className="w-3 h-0.5 bg-gray-400 dark:bg-gray-500"></span>
            </span>
          </span>
          <span>Disabled</span>
        </button>
        <button
          type="button"
          onClick={() => handleAutoClearModeChange("immediate")}
          className={`${
            autoClearMode === "immediate" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
          } text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <span className="w-4 h-4 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs">
              <span>⚡</span>
            </span>
          </span>
          <span>Immediate</span>
        </button>
        <button
          type="button"
          onClick={() => handleAutoClearModeChange("hourly")}
          className={`${
            autoClearMode === "hourly" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
          } text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <span className="w-4 h-4 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs">
              <span>1h</span>
            </span>
          </span>
          <span>After 1 hour</span>
        </button>
        <button
          type="button"
          onClick={() => handleAutoClearModeChange("daily")}
          className={`${
            autoClearMode === "daily" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
          } text-gray-700 dark:text-gray-300 flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
        >
          <span className="flex items-center justify-center w-5 h-5 mr-3">
            <span className="w-4 h-4 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs">
              <span>1d</span>
            </span>
          </span>
          <span>After date change</span>
        </button>
      </div>
    </div>
  );
};
