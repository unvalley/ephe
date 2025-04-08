"use client";

import { useTheme } from "../../hooks/use-theme";
import { MoonIcon, SunIcon, TableOfContentsIcon, WidthIcon } from "../../components/icons";
import { usePaperMode } from "../../hooks/use-paper-mode";
import { useEditorWidth } from "../../hooks/use-editor-width";
import { useToc } from "../../hooks/use-toc";

export const SystemMenu = () => {
  const { nextTheme, setTheme, isDarkMode } = useTheme();
  const { paperMode, toggleGraphMode, toggleDotsMode, toggleNormalMode } = usePaperMode();
  const { isVisibleToc, toggleToc } = useToc();
  const { editorWidth, setNormalWidth, setWideWidth } = useEditorWidth();

  return (
    <div
      id="system-menu-container"
      className="bg-mono-50 dark:bg-mono-700 z-10 w-56 divide-y divide-mono-100 dark:divide-mono-500 rounded-md ring-1 shadow-lg ring-black/5 dark:ring-white/10 ring-opacity-5 focus:outline-none"
    >
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
