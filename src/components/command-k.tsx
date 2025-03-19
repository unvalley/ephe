"use client";

import { Command } from "cmdk";
import React, { useEffect, useRef } from "react";

type CommandMenuProps = {
  open: boolean;
  onClose?: () => void;
  onOpen?: () => void;
};

export const CommandMenu = ({ open, onClose, onOpen }: CommandMenuProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (open) {
          onClose?.();
        } else {
          onOpen?.();
        }
      }

      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation(); // ensure the event doesn't reach Monaco editor
        onClose?.();
      }
    };

    // Use capture phase to handle the event before it reaches Monaco editor
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose, onOpen]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  return (
    <>
      {/* Overlay */}
      {open && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
        <div
          className="fixed inset-0 bg-gray-300/50 dark:bg-gray-700/50 backdrop-blur-sm z-40"
          onClick={(e) => {
            e.preventDefault();
            onClose?.();
          }}
        />
      )}
      <Command
        label="Command Menu"
        className={`fixed top-[20%] left-1/2 transform -translate-x-1/2 w-[90vw] max-w-[640px] rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-50 ${
          open ? "block" : "hidden"
        }`}
      >
        <Command.Input
          ref={inputRef}
          placeholder="Type a command or search..."
          className="w-full px-4 py-3 text-base border-b border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100 outline-none"
        />
        <Command.List className="max-h-[300px] overflow-auto p-2">
          <Command.Empty className="py-2 px-4 text-sm text-gray-500 dark:text-gray-400">
            No results found.
          </Command.Empty>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            onSelect={() => {
              // Toggle dark mode
              document.documentElement.classList.toggle("dark");
              onClose?.();
            }}
          >
            Toggle theme
          </Command.Item>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            onSelect={() => {
              window.open("https://github.com/unvalley/ephe", "_blank");
              onClose?.();
            }}
          >
            Got to GitHub
          </Command.Item>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            onSelect={() => {
              onClose?.();
            }}
          >
            Format document
          </Command.Item>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            onSelect={() => {
              onClose?.();
            }}
          >
            Show previous tasks
          </Command.Item>
        </Command.List>
      </Command>
    </>
  );
};
