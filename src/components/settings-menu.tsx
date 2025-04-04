"use client";

import { useTheme } from "../hooks/use-theme";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { SettingsIcon, MoonIcon, SunIcon, TableOfContentsIcon } from "./icons";
import { usePaperMode } from "../hooks/use-paper-mode";

type SettingsMenuProps = {
  isTocVisible: boolean;
  toggleToc: () => void;
};

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isTocVisible, toggleToc }) => {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";
  const { paperMode, toggleGraphMode, toggleDotsMode, toggleNormalMode } = usePaperMode();

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <MenuButton className="cursor-pointer p-2 flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md dark:text-gray-200 dark:shadow-gray-900/30">
          <SettingsIcon />
        </MenuButton>
      </div>

      <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-gray-800 ring-1 shadow-lg ring-black/5 dark:ring-white/10 ring-opacity-5 focus:outline-none dark:shadow-gray-900/30">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          Settings
        </div>

        <div className="py-1">
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={toggleTheme}
                className={`${
                  focus
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    : "text-gray-700 dark:text-gray-300"
                } flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
              >
                <span className="flex items-center justify-center w-5 h-5 mr-3 text-gray-600 dark:text-gray-300">
                  {isDarkMode ? <SunIcon /> : <MoonIcon />}
                </span>
                <span>{isDarkMode ? "Light mode" : "Dark mode"}</span>
              </button>
            )}
          </MenuItem>
        </div>

        <div className="py-1">
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={toggleToc}
                className={`${
                  focus
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    : "text-gray-700 dark:text-gray-300"
                } flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
              >
                <span className="flex items-center justify-center w-5 h-5 mr-3 text-gray-600 dark:text-gray-300">
                  <TableOfContentsIcon />
                </span>
                <span>{isTocVisible ? "Hide ToC" : "Show ToC"}</span>
              </button>
            )}
          </MenuItem>
        </div>

        <div className="py-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Paper Mode</div>
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={toggleNormalMode}
                className={`${
                  focus
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    : "text-gray-700 dark:text-gray-300"
                } ${
                  paperMode === "none" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
                } flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
              >
                <span className="flex items-center justify-center w-5 h-5 mr-3">
                  <span className="w-4 h-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"></span>
                </span>
                <span>Normal paper</span>
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={toggleGraphMode}
                className={`${
                  focus
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    : "text-gray-700 dark:text-gray-300"
                } ${
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
                <span>Graph paper</span>
              </button>
            )}
          </MenuItem>
          <MenuItem>
            {({ focus }) => (
              <button
                type="button"
                onClick={toggleDotsMode}
                className={`${
                  focus
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    : "text-gray-700 dark:text-gray-300"
                } ${
                  paperMode === "dots" ? "font-semibold bg-gray-50 dark:bg-gray-700/50" : ""
                } flex w-full items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors duration-150`}
              >
                <span className="flex items-center justify-center w-5 h-5 mr-3">
                  <span className="w-4 h-4 border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                  </span>
                </span>
                <span>Dots paper</span>
              </button>
            )}
          </MenuItem>
        </div>
      </MenuItems>
    </Menu>
  );
};

export const SettingsContainer = ({ isTocVisible, toggleToc }: { isTocVisible: boolean; toggleToc: () => void }) => {
  return (
    <div className="fixed top-4 right-4 z-50">
      <SettingsMenu isTocVisible={isTocVisible} toggleToc={toggleToc} />
    </div>
  );
};
