"use client";

import { Command } from "cmdk";
import { useEffect, useRef } from "react";
import { useTheme } from "../hooks/use-theme";
import { useNavigate } from "react-router-dom";
import type * as monaco from "monaco-editor";
import type { MarkdownFormatter } from "../features/markdown/markdown-formatter";
import { showToast } from "./toast";
import { fetchGitHubIssuesTaskList } from "../features/github/github-api";
import type { PaperMode } from "../hooks/use-paper-mode";

type CommandMenuProps = {
  open: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  editorContent: string;
  editorRef?: React.RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  markdownFormatterRef?: React.RefObject<MarkdownFormatter | null>;
  paperMode?: PaperMode;
  cyclePaperMode?: () => PaperMode;
};

export const CommandMenu = ({
  open,
  onClose,
  onOpen,
  editorContent,
  editorRef,
  markdownFormatterRef,
  paperMode = "none",
  cyclePaperMode,
}: CommandMenuProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toggleTheme, toggleTargetTheme } = useTheme();
  const navigate = useNavigate();

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

  // Function to format document using dprint
  const handleFormatDocument = async () => {
    if (!editorRef?.current || !markdownFormatterRef?.current) {
      console.error("Editor or markdown formatter not available");
      return;
    }

    try {
      const editor = editorRef.current;
      // Save current cursor position and selection
      const selection = editor.getSelection();
      const scrollTop = editor.getScrollTop();

      const content = editor.getValue();
      const formattedContent = await markdownFormatterRef.current.formatMarkdown(content);

      // Apply the formatted content
      editor.setValue(formattedContent);

      // Restore cursor position and selection
      if (selection) {
        editor.setSelection(selection);
        editor.setScrollTop(scrollTop);
      }

      showToast("Document formatted successfully", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      showToast(`Error formatting document: ${message}`, "error");
    }

    onClose?.();
  };

  // Function to fetch and insert GitHub issues as tasks
  const handleInsertGitHubIssues = async () => {
    if (!editorRef?.current) {
      showToast("Editor not available", "error");
      return;
    }

    try {
      const github_user_id = prompt("Enter GitHub User ID:");

      // If user cancels the prompt or enters empty string, abort
      if (!github_user_id) {
        return;
      }

      // Fetch GitHub issues
      const issuesTaskList = await fetchGitHubIssuesTaskList(github_user_id);

      // Insert issues at current cursor position
      const editor = editorRef.current;
      const selection = editor.getSelection();

      if (selection) {
        editor.executeEdits("", [
          {
            range: selection,
            text: issuesTaskList,
            forceMoveMarkers: true,
          },
        ]);
      }

      showToast(`Inserted GitHub issues for ${github_user_id}`, "success");
    } catch (error) {
      console.error("Error inserting GitHub issues:", error);
      showToast("Failed to insert GitHub issues", "error");
    }

    onClose?.();
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
        <div
          className="fixed z-40 inset-0"
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

          {cyclePaperMode && (
            <Command.Item
              className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer aria-selected:bg-blue-100 dark:aria-selected:bg-blue-900"
              onSelect={() => {
                cyclePaperMode();
                onClose?.();
              }}
            >
              Cycle paper mode {paperMode !== "none" ? `(current: ${paperMode})` : ""}
            </Command.Item>
          )}

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
            onSelect={handleFormatDocument}
          >
            Format document
          </Command.Item>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer aria-selected:bg-blue-100 dark:aria-selected:bg-blue-900"
            onSelect={handleInsertGitHubIssues}
          >
            Insert GitHub Issues (Public Repos)
          </Command.Item>

          <Command.Item
            className="px-4 py-2 rounded text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer aria-selected:bg-blue-100 dark:aria-selected:bg-blue-900"
            onSelect={() => {
              navigate("/history");
              onClose?.();
            }}
          >
            View History
          </Command.Item>
        </Command.List>
      </Command>
    </>
  );
};
