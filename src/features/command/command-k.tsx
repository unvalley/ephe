"use client";

import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../utils/hooks/use-theme";
import { useNavigate } from "react-router-dom";
import type * as monaco from "monaco-editor";
import type { MarkdownFormatter } from "../editor/markdown/formatter/markdown-formatter";
import { showToast } from "../../utils/components/toast";
import { fetchGitHubIssuesTaskList } from "../integration/github/github-api";
import type { PaperMode } from "../../utils/hooks/use-paper-mode";
import type { EditorWidth } from "../../utils/hooks/use-editor-width";
import { EyeIcon } from "../../utils/components/icons";
import { COLOR_THEME } from "../../utils/theme-initializer";

// Icons - you might need to install react-icons package if not already installed
function ThemeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M7.5 0C3.36 0 0 3.36 0 7.5C0 11.64 3.36 15 7.5 15C11.64 15 15 11.64 15 7.5C15 3.36 11.64 0 7.5 0ZM1.5 7.5C1.5 4.19 4.19 1.5 7.5 1.5C10.81 1.5 13.5 4.19 13.5 7.5C13.5 8.88 13.03 10.15 12.24 11.17C11.5 10.04 10.2 9.3 8.75 9.3C6.54 9.3 4.75 11.09 4.75 13.3C4.75 13.38 4.76 13.46 4.76 13.54C2.82 12.51 1.5 10.15 1.5 7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ExportIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M3 2C2.44772 2 2 2.44772 2 3V12C2 12.5523 2.44772 13 3 13H12C12.5523 13 13 12.5523 13 12V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V12H3V3H6.5C6.77614 3 7 2.77614 7 2.5C7 2.22386 6.77614 2 6.5 2H3ZM12.8536 2.14645C12.9015 2.19439 12.9377 2.24964 12.9621 2.30861C12.9861 2.36669 12.9996 2.4303 13 2.497L13 2.5V2.50049V5.5C13 5.77614 12.7761 6 12.5 6C12.2239 6 12 5.77614 12 5.5V3.70711L6.85355 8.85355C6.65829 9.04882 6.34171 9.04882 6.14645 8.85355C5.95118 8.65829 5.95118 8.34171 6.14645 8.14645L11.2929 3H9.5C9.22386 3 9 2.77614 9 2.5C9 2.22386 9.22386 2 9.5 2H12.4999H12.5C12.5678 2 12.6324 2.01349 12.6914 2.03794C12.7504 2.06234 12.8056 2.09851 12.8536 2.14645Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FormatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M1.99998 2.5C1.99998 2.22386 2.22383 2 2.49998 2H12.5C12.7761 2 13 2.22386 13 2.5C13 2.77614 12.7761 3 12.5 3H2.49998C2.22383 3 1.99998 2.77614 1.99998 2.5ZM1.99998 7.5C1.99998 7.22386 2.22383 7 2.49998 7H7.5C7.77615 7 8 7.22386 8 7.5C8 7.77614 7.77615 8 7.5 8H2.49998C2.22383 8 1.99998 7.77614 1.99998 7.5ZM2.49998 12C2.22383 12 1.99998 12.2239 1.99998 12.5C1.99998 12.7761 2.22383 13 2.49998 13H9.50001C9.77616 13 10 12.7761 10 12.5C10 12.2239 9.77616 12 9.50001 12H2.49998Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M7.49933 0.25C3.49635 0.25 0.25 3.49593 0.25 7.50024C0.25 10.703 2.32715 13.4206 5.2081 14.3797C5.57084 14.446 5.70302 14.2222 5.70302 14.0299C5.70302 13.8576 5.69679 13.4019 5.69323 12.797C3.67661 13.235 3.25112 11.825 3.25112 11.825C2.92132 10.9874 2.44599 10.7644 2.44599 10.7644C1.78773 10.3149 2.49584 10.3238 2.49584 10.3238C3.22353 10.375 3.60629 11.0711 3.60629 11.0711C4.25298 12.1788 5.30335 11.8588 5.71638 11.6732C5.78225 11.205 5.96962 10.8854 6.17658 10.7043C4.56675 10.5209 2.87415 9.89918 2.87415 7.12104C2.87415 6.32925 3.15677 5.68257 3.62053 5.17563C3.54576 4.99226 3.29697 4.25521 3.69174 3.25691C3.69174 3.25691 4.30015 3.06196 5.68522 3.99973C6.26337 3.83906 6.8838 3.75895 7.50022 3.75583C8.1162 3.75895 8.73619 3.83906 9.31523 3.99973C10.6994 3.06196 11.3069 3.25691 11.3069 3.25691C11.7026 4.25521 11.4538 4.99226 11.3795 5.17563C11.8441 5.68257 12.1245 6.32925 12.1245 7.12104C12.1245 9.9063 10.4292 10.5192 8.81452 10.6985C9.07444 10.9224 9.30633 11.3648 9.30633 12.0413C9.30633 13.0102 9.29742 13.7922 9.29742 14.0299C9.29742 14.2239 9.42828 14.4496 9.79591 14.3788C12.6746 13.4179 14.75 10.7025 14.75 7.50024C14.75 3.49593 11.5036 0.25 7.49933 0.25Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WidthIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H12C12.8284 1.5 13.5 2.17157 13.5 3V12C13.5 12.8284 12.8284 13.5 12 13.5H3C2.17157 13.5 1.5 12.8284 1.5 12V3ZM3 2.5C2.72386 2.5 2.5 2.72386 2.5 3V12C2.5 12.2761 2.72386 12.5 3 12.5H12C12.2761 12.5 12.5 12.2761 12.5 12V3C12.5 2.72386 12.2761 2.5 12 2.5H3Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path
        d="M9.85355 7.14645C9.65829 6.95118 9.34171 6.95118 9.14645 7.14645C8.95118 7.34171 8.95118 7.65829 9.14645 7.85355L10.7929 9.5H4.20711L5.85355 7.85355C6.04882 7.65829 6.04882 7.34171 5.85355 7.14645C5.65829 6.95118 5.34171 6.95118 5.14645 7.14645L2.64645 9.64645C2.45118 9.84171 2.45118 10.1583 2.64645 10.3536L5.14645 12.8536C5.34171 13.0488 5.65829 13.0488 5.85355 12.8536C6.04882 12.6583 6.04882 12.3417 5.85355 12.1464L4.20711 10.5H10.7929L9.14645 12.1464C8.95118 12.3417 8.95118 12.6583 9.14645 12.8536C9.34171 13.0488 9.65829 13.0488 9.85355 12.8536L12.3536 10.3536C12.5488 10.1583 12.5488 9.84171 12.3536 9.64645L9.85355 7.14645Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PaperIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M3 2.5C3 2.22386 3.22386 2 3.5 2H11.5C11.7761 2 12 2.22386 12 2.5V13.5C12 13.7761 11.7761 14 11.5 14H3.5C3.22386 14 3 13.7761 3 13.5V2.5ZM3.5 1C2.67157 1 2 1.67157 2 2.5V13.5C2 14.3284 2.67157 15 3.5 15H11.5C12.3284 15 13 14.3284 13 13.5V2.5C13 1.67157 12.3284 1 11.5 1H3.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <path
        d="M4.5 4C4.22386 4 4 4.22386 4 4.5C4 4.77614 4.22386 5 4.5 5H10.5C10.7761 5 11 4.77614 11 4.5C11 4.22386 10.7761 4 10.5 4H4.5ZM4.5 7C4.22386 7 4 7.22386 4 7.5C4 7.77614 4.22386 8 4.5 8H10.5C10.7761 8 11 7.77614 11 7.5C11 7.22386 10.7761 7 10.5 7H4.5ZM4 10.5C4 10.2239 4.22386 10 4.5 10H10.5C10.7761 10 11 10.2239 11 10.5C11 10.7761 10.7761 11 10.5 11H4.5C4.22386 11 4 10.7761 4 10.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M4.5 6H3.5C2.11929 6 1 7.11929 1 8.5C1 9.88071 2.11929 11 3.5 11H5.5C6.88071 11 8 9.88071 8 8.5C8 8.03309 7.87736 7.59527 7.66172 7.21969C7.51424 6.97526 7.66962 6.65625 7.94742 6.65625C8.13452 6.65625 8.30352 6.75256 8.38787 6.91519C8.68829 7.44268 8.85872 8.05778 8.85872 8.70938C8.85872 10.3255 7.55436 11.6383 5.94687 11.6383H3.05313C1.44564 11.6383 0.141277 10.3255 0.141277 8.70938C0.141277 7.09321 1.44564 5.78047 3.05313 5.78047H4.83437C4.85407 5.78047 4.87376 5.78133 4.89335 5.78309C5.04548 5.79652 5.16492 5.92762 5.16492 6.08161C5.16492 6.24372 5.03341 6.37523 4.8713 6.37523H4.83437H4.5Z"
        fill="currentColor"
      />
      <path
        d="M10.5 9H11.5C12.8807 9 14 7.88071 14 6.5C14 5.11929 12.8807 4 11.5 4H9.5C8.11929 4 7 5.11929 7 6.5C7 6.96691 7.12264 7.40473 7.33828 7.78031C7.48576 8.02474 7.33038 8.34375 7.05258 8.34375C6.86548 8.34375 6.69648 8.24744 6.61213 8.08481C6.31171 7.55732 6.14128 6.94222 6.14128 6.29062C6.14128 4.6745 7.44564 3.36172 9.05313 3.36172H11.9469C13.5544 3.36172 14.8587 4.6745 14.8587 6.29062C14.8587 7.90679 13.5544 9.21953 11.9469 9.21953H10.1656C10.1459 9.21953 10.1262 9.21867 10.1067 9.21691C9.95452 9.20348 9.83508 9.07238 9.83508 8.91839C9.83508 8.75628 9.96659 8.62477 10.1287 8.62477H10.1656H10.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HistoryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M7.5 0.875C3.83152 0.875 0.875 3.83152 0.875 7.5C0.875 11.1685 3.83152 14.125 7.5 14.125C11.1685 14.125 14.125 11.1685 14.125 7.5C14.125 3.83152 11.1685 0.875 7.5 0.875ZM7.5 1.825C10.6421 1.825 13.175 4.35786 13.175 7.5C13.175 10.6421 10.6421 13.175 7.5 13.175C4.35786 13.175 1.825 10.6421 1.825 7.5C1.825 4.35786 4.35786 1.825 7.5 1.825ZM7.5 3.25C7.22386 3.25 7 3.47386 7 3.75V7.5C7 7.66476 7.07511 7.81941 7.20096 7.92049L10.3006 10.2016C10.5303 10.3784 10.8438 10.3203 11.0206 10.0906C11.1974 9.86094 11.1393 9.54738 10.9095 9.37061L8 7.24971V3.75C8 3.47386 7.77614 3.25 7.5 3.25Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

type CommandMenuProps = {
  open: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  editorContent: string;
  editorRef?: React.RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  markdownFormatterRef?: React.RefObject<MarkdownFormatter | null>;
  paperMode?: PaperMode;
  cyclePaperMode?: () => PaperMode;
  editorWidth?: EditorWidth;
  toggleEditorWidth?: () => void;
  previewMode?: boolean;
  togglePreviewMode?: () => void;
};

export const CommandMenu = ({
  open,
  onClose,
  onOpen,
  editorContent,
  editorRef,
  markdownFormatterRef,
  paperMode = "normal",
  cyclePaperMode,
  editorWidth = "normal",
  toggleEditorWidth,
  previewMode = false,
  togglePreviewMode,
}: CommandMenuProps) => {
  const { theme, setTheme } = useTheme();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Function to cycle through theme modes
  const cycleTheme = () => {
    if (theme === COLOR_THEME.LIGHT) {
      setTheme(COLOR_THEME.DARK);
    } else if (theme === COLOR_THEME.DARK) {
      setTheme(COLOR_THEME.SYSTEM);
    } else {
      setTheme(COLOR_THEME.LIGHT);
    }
  };

  // Get the next theme in the cycle for display
  const getNextThemeText = () => {
    if (theme === COLOR_THEME.LIGHT) {
      return "dark";
    } else if (theme === COLOR_THEME.DARK) {
      return "system";
    } else {
      return "light";
    }
  };

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

      // Make ESC key close the command menu immediately
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
      // Ensure focus is set reliably with a slight delay
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        setInputValue("");
      }, 10);
      return () => clearTimeout(timer);
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

      showToast("Document formatted successfully", "default");
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

  const footerLinks = [{ key: "shortcuts", text: "⌘+K", title: "Command menu" }];

  return (
    <>
      {/* Animated overlay */}
      {open && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[1px] z-40 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            onClose?.();
          }}
        />
      )}

      <Command
        label="Command Menu"
        className={`fixed top-[20%] left-1/2 transform -translate-x-1/2 w-[90vw] max-w-[640px] rounded-xl 
          bg-white dark:bg-zinc-900 shadow-2xl border border-gray-200 dark:border-zinc-800 
          z-50 overflow-hidden transition-all duration-100
          ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
        onValueChange={setInputValue}
      >
        <div className="border-b border-gray-200 dark:border-zinc-800 px-3 pt-2 pb-1.5">
          <div className="search-icon ml-2 mr-3 text-gray-400 dark:text-gray-500 pointer-events-none absolute text-[0.9rem] mt-[0.7rem]">
            <svg width="1em" height="1em" viewBox="0 0 16 16" className="opacity-70" aria-hidden="true">
              <path
                fill="currentColor"
                d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7ZM7 1.5C3.69 1.5 1 4.19 1 7.5s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6Z"
              />
              <path fill="currentColor" d="m11.45 13.89 4.25 4.25a.5.5 0 0 0 .71-.71l-4.25-4.25a.5.5 0 0 0-.71.71Z" />
            </svg>
          </div>
          <Command.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            placeholder="Type a command or search..."
            className="w-full py-2.5 pl-9 pr-2 bg-transparent text-gray-900 dark:text-gray-100 outline-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        <Command.List
          ref={listRef}
          className="max-h-[300px] overflow-auto p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent"
        >
          <Command.Empty className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No results found.
          </Command.Empty>

          <Command.Group heading="Interface Mode" className="px-1 mb-1 text-xs text-mono-400 dark:text-mono-200">
            <Command.Item
              className="mt-1 px-2 py-2.5 rounded-md text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2
                cursor-pointer group hover:bg-gray-100 dark:hover:bg-zinc-800 
                aria-selected:bg-primary-500/10 dark:aria-selected:bg-primary-500/20
                aria-selected:text-primary-600 dark:aria-selected:text-primary-400
                transition-colors"
              onSelect={() => {
                cycleTheme();
                onClose?.();
              }}
              value="theme toggle switch mode light dark system"
            >
              <div className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100/80 dark:bg-zinc-700/60 text-gray-900 dark:text-gray-100 group-hover:bg-gray-200 dark:group-hover:bg-zinc-600 group-aria-selected:bg-primary-500/20 dark:group-aria-selected:bg-primary-600/20 transition-colors">
                <ThemeIcon className="h-3.5 w-3.5" />
              </div>
              <span>Switch to {getNextThemeText()} mode</span>
            </Command.Item>

            {cyclePaperMode && (
              <Command.Item
                className="px-2 py-2.5 rounded-md text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2
                  cursor-pointer group hover:bg-gray-100 dark:hover:bg-zinc-800 
                  aria-selected:bg-primary-500/10 dark:aria-selected:bg-primary-500/20
                  aria-selected:text-primary-600 dark:aria-selected:text-primary-400
                  transition-colors"
                onSelect={() => {
                  cyclePaperMode();
                  onClose?.();
                }}
                value="paper mode cycle switch paper"
              >
                <div className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100/80 dark:bg-zinc-700/60 text-gray-900 dark:text-gray-100 group-hover:bg-gray-200 dark:group-hover:bg-zinc-600 group-aria-selected:bg-primary-500/20 dark:group-aria-selected:bg-primary-600/20 transition-colors">
                  <PaperIcon className="h-3.5 w-3.5" />
                </div>
                <span>
                  Cycle paper mode <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{paperMode}</span>
                </span>
              </Command.Item>
            )}

            {toggleEditorWidth && (
              <Command.Item
                className="px-2 py-2.5 rounded-md text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2
                  cursor-pointer group hover:bg-gray-100 dark:hover:bg-zinc-800 
                  aria-selected:bg-primary-500/10 dark:aria-selected:bg-primary-500/20
                  aria-selected:text-primary-600 dark:aria-selected:text-primary-400
                  transition-colors"
                onSelect={() => {
                  toggleEditorWidth();
                  onClose?.();
                }}
                value="editor width toggle resize"
              >
                <div className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100/80 dark:bg-zinc-700/60 text-gray-900 dark:text-gray-100 group-hover:bg-gray-200 dark:group-hover:bg-zinc-600 group-aria-selected:bg-primary-500/20 dark:group-aria-selected:bg-primary-600/20 transition-colors">
                  <WidthIcon className="h-3.5 w-3.5" />
                </div>
                <span>
                  Toggle editor width{" "}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{editorWidth}</span>
                </span>
              </Command.Item>
            )}

            {togglePreviewMode && (
              <Command.Item
                className="px-2 py-2.5 rounded-md text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2
                  cursor-pointer group hover:bg-gray-100 dark:hover:bg-zinc-800 
                  aria-selected:bg-primary-500/10 dark:aria-selected:bg-primary-500/20
                  aria-selected:text-primary-600 dark:aria-selected:text-primary-400
                  transition-colors"
                onSelect={() => {
                  togglePreviewMode();
                  onClose?.();
                }}
                value="preview mode toggle switch"
              >
                <div className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100/80 dark:bg-zinc-700/60 text-gray-900 dark:text-gray-100 group-hover:bg-gray-200 dark:group-hover:bg-zinc-600 group-aria-selected:bg-primary-500/20 dark:group-aria-selected:bg-primary-600/20 transition-colors">
                  <EyeIcon className="h-3.5 w-3.5" />
                </div>
                <span>Toggle preview mode ({previewMode ? "on" : "off"})</span>
              </Command.Item>
            )}
          </Command.Group>

          <Command.Group heading="Operations" className="px-1 mb-1 text-xs text-mono-400 dark:text-mono-200">
            <Command.Item
              className="mt-1 px-2 py-2.5 rounded-md text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2
                cursor-pointer group hover:bg-gray-100 dark:hover:bg-zinc-800 
                aria-selected:bg-primary-500/10 dark:aria-selected:bg-primary-500/20
                aria-selected:text-primary-600 dark:aria-selected:text-primary-400
                transition-colors"
              onSelect={handleExportMarkdown}
              value="export markdown save download"
            >
              <div className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100/80 dark:bg-zinc-700/60 text-gray-900 dark:text-gray-100 group-hover:bg-gray-200 dark:group-hover:bg-zinc-600 group-aria-selected:bg-primary-500/20 dark:group-aria-selected:bg-primary-600/20 transition-colors">
                <ExportIcon className="h-3.5 w-3.5" />
              </div>
              <span>Export markdown</span>
            </Command.Item>

            <Command.Item
              className="px-2 py-2.5 rounded-md text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2
                cursor-pointer group hover:bg-gray-100 dark:hover:bg-zinc-800 
                aria-selected:bg-primary-500/10 dark:aria-selected:bg-primary-500/20
                aria-selected:text-primary-600 dark:aria-selected:text-primary-400
                transition-colors"
              onSelect={handleFormatDocument}
              value="format document prettify"
            >
              <div className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100/80 dark:bg-zinc-700/60 text-gray-900 dark:text-gray-100 group-hover:bg-gray-200 dark:group-hover:bg-zinc-600 group-aria-selected:bg-primary-500/20 dark:group-aria-selected:bg-primary-600/20 transition-colors">
                <FormatIcon className="h-3.5 w-3.5" />
              </div>
              <span>Format document</span>
            </Command.Item>

            <Command.Item
              className="px-2 py-2.5 rounded-md text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2
                cursor-pointer group hover:bg-gray-100 dark:hover:bg-zinc-800 
                aria-selected:bg-primary-500/10 dark:aria-selected:bg-primary-500/20
                aria-selected:text-primary-600 dark:aria-selected:text-primary-400
                transition-colors"
              onSelect={handleInsertGitHubIssues}
              value="github issues insert fetch public repos"
            >
              <div className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100/80 dark:bg-zinc-700/60 text-gray-900 dark:text-gray-100 group-hover:bg-gray-200 dark:group-hover:bg-zinc-600 group-aria-selected:bg-primary-500/20 dark:group-aria-selected:bg-primary-600/20 transition-colors">
                <GitHubIcon className="h-3.5 w-3.5" />
              </div>
              <span>Insert GitHub Issues (Public Repos)</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Move" className="px-1 mb-1 text-xs text-mono-400 dark:text-mono-200">
            <Command.Item
              className="mt-1 px-2 py-2.5 rounded-md text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2
                cursor-pointer group hover:bg-gray-100 dark:hover:bg-zinc-800 
                aria-selected:bg-primary-500/10 dark:aria-selected:bg-primary-500/20
                aria-selected:text-primary-600 dark:aria-selected:text-primary-400
                transition-colors"
              onSelect={() => {
                window.open("https://github.com/unvalley/ephe", "_blank");
                onClose?.();
              }}
              value="github ephe repo project"
            >
              <div className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100/80 dark:bg-zinc-700/60 text-gray-900 dark:text-gray-100 group-hover:bg-gray-200 dark:group-hover:bg-zinc-600 group-aria-selected:bg-primary-500/20 dark:group-aria-selected:bg-primary-600/20 transition-colors">
                <LinkIcon className="h-3.5 w-3.5" />
              </div>
              <span>Go to Ephe GitHub Repo</span>
            </Command.Item>

            <Command.Item
              className="px-2 py-2.5 rounded-md text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2
                cursor-pointer group hover:bg-gray-100 dark:hover:bg-zinc-800 
                aria-selected:bg-primary-500/10 dark:aria-selected:bg-primary-500/20
                aria-selected:text-primary-600 dark:aria-selected:text-primary-400
                transition-colors"
              onSelect={() => {
                navigate("/history");
                onClose?.();
              }}
              value="history document past versions"
            >
              <div className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100/80 dark:bg-zinc-700/60 text-gray-900 dark:text-gray-100 group-hover:bg-gray-200 dark:group-hover:bg-zinc-600 group-aria-selected:bg-primary-500/20 dark:group-aria-selected:bg-primary-600/20 transition-colors">
                <HistoryIcon className="h-3.5 w-3.5" />
              </div>
              <span>Go to History</span>
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div className="border-t border-gray-200 dark:border-zinc-800 px-2 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex gap-2">
            {footerLinks.map((link) => (
              <div key={link.key} className="flex items-center gap-1" title={link.title}>
                <span>{link.text}</span>
              </div>
            ))}
          </div>
          <div className="text-xs">
            <span>Ephe</span>
          </div>
        </div>
      </Command>
    </>
  );
};
