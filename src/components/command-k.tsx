"use client";

import { Command } from "cmdk";
import { useEffect, useRef } from "react";
import { useTheme } from "../hooks/use-theme";

type CommandMenuProps = {
  open: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  editorContent: string;
};

export const CommandMenu = ({ open, onClose, onOpen, editorContent }: CommandMenuProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toggleTheme, toggleTargetTheme } = useTheme();

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
      inputRef.current?.focus();
    }
  }, [open]);

  // Function to export markdown content
  const handleExportMarkdown = () => {
    const blob = new Blob([editorContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `ephe_${date}.md`;

    // Trigger the download
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose?.();
  };

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
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer aria-selected:bg-blue-100 dark:aria-selected:bg-blue-900"
            onSelect={() => {
              toggleTheme();
              onClose?.();
            }}
          >
            Switch to {toggleTargetTheme} mode
          </Command.Item>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer aria-selected:bg-blue-100 dark:aria-selected:bg-blue-900"
            onSelect={handleExportMarkdown}
          >
            Export as Markdown
          </Command.Item>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer aria-selected:bg-blue-100 dark:aria-selected:bg-blue-900"
            onSelect={() => {
              window.open("https://github.com/unvalley/ephe", "_blank");
              onClose?.();
            }}
          >
            Go to GitHub
          </Command.Item>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer aria-selected:bg-blue-100 dark:aria-selected:bg-blue-900"
            onSelect={() => {
              onClose?.();
            }}
          >
            Format document (WIP)
          </Command.Item>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer aria-selected:bg-blue-100 dark:aria-selected:bg-blue-900"
            onSelect={() => {
              onClose?.();
            }}
          >
            Show previous tasks (WIP)
          </Command.Item>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer aria-selected:bg-blue-100 dark:aria-selected:bg-blue-900"
            onSelect={() => {
              window.location.href = "/completed-tasks";
              onClose?.();
            }}
          >
            View completed tasks
          </Command.Item>
        </Command.List>
      </Command>
    </>
  );
};
