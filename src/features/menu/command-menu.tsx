"use client";

import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../utils/hooks/use-theme";
import { showToast } from "../../utils/components/toast";
import { usePaperMode } from "../../utils/hooks/use-paper-mode";
import { COLOR_THEME } from "../../utils/theme-initializer";
import { useEditorWidth } from "../../utils/hooks/use-editor-width";
import { useFontFamily, FONT_FAMILIES, FONT_FAMILY_OPTIONS } from "../../utils/hooks/use-font";
import type { EditorView } from "@codemirror/view";
import { fetchGitHubIssuesTaskList } from "../integration/github/github-api";
import { DprintMarkdownFormatter } from "../editor/markdown/formatter/dprint-markdown-formatter";
import {
  ComputerDesktopIcon,
  DocumentIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  NewspaperIcon,
  SunIcon,
  ViewColumnsIcon,
  CodeBracketIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

// Custom hook for markdown formatter
const useMarkdownFormatter = () => {
  const ref = useRef<DprintMarkdownFormatter | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const fmt = await DprintMarkdownFormatter.getInstance();
      if (alive) {
        ref.current = fmt;
      }
    })();
    return () => {
      alive = false;
      ref.current = null;
    };
  }, []);
  return ref;
};

type CommandMenuProps = {
  open: boolean;
  onClose?: () => void;
  editorContent?: string;
  editorView?: EditorView;
  onOpenHistoryModal?: (tabIndex: number) => void;
};

type CommandItem = {
  id: string;
  name: string;
  icon?: React.ReactNode;
  shortcut?: string;
  perform: () => void;
};

export const CommandMenu = ({
  open,
  onClose = () => {},
  editorContent = "",
  editorView,
  onOpenHistoryModal,
}: CommandMenuProps) => {
  const { nextTheme, cycleTheme } = useTheme();
  const { paperMode: currentPaperMode, cyclePaperMode } = usePaperMode();
  const { editorWidth: currentEditorWidth, toggleEditorWidth } = useEditorWidth();
  const { fontFamily, setFontFamily } = useFontFamily();
  const formatterRef = useMarkdownFormatter();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      // Clear input when menu closes
      setInputValue("");
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true); // Use capture phase
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose]);

  const cyclePaperModeThenClose = () => {
    cyclePaperMode();
    onClose();
  };

  const toggleEditorWidthThenClose = () => {
    toggleEditorWidth();
    onClose();
  };

  const cycleFont = () => {
    const fontKeys = FONT_FAMILY_OPTIONS;
    const currentIndex = fontKeys.indexOf(fontFamily);
    const nextIndex = (currentIndex + 1) % fontKeys.length;
    setFontFamily(fontKeys[nextIndex]);
    onClose();
  };

  const openTaskModal = () => {
    if (!onOpenHistoryModal) return;
    onClose(); // Close command menu first
    // Use requestAnimationFrame to ensure command menu has completed its close animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onOpenHistoryModal(0);
      });
    });
  };

  const openSnapshotModal = () => {
    if (!onOpenHistoryModal) return;
    onClose(); // Close command menu first
    // Use requestAnimationFrame to ensure command menu has completed its close animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onOpenHistoryModal(1);
      });
    });
  };

  const handleExportMarkdown = () => {
    if (!editorContent) {
      showToast("No content to export", "error");
      onClose();
      return;
    }
    try {
      const blob = new Blob([editorContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `ephe_${date}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Markdown exported", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Failed to export markdown", "error");
    } finally {
      onClose();
    }
  };

  const handleFormatDocument = async () => {
    if (!editorView || !formatterRef.current) {
      showToast("Editor or markdown formatter not available", "error");
      onClose();
      return;
    }
    try {
      const { state } = editorView;
      const scrollTop = editorView.scrollDOM.scrollTop;
      const cursorPos = state.selection.main.head;
      const cursorLine = state.doc.lineAt(cursorPos);
      const cursorLineNumber = cursorLine.number;
      const cursorColumn = cursorPos - cursorLine.from;
      const currentText = state.doc.toString();
      const formattedText = await formatterRef.current.formatMarkdown(currentText);

      if (formattedText !== currentText) {
        editorView.dispatch({
          changes: { from: 0, to: state.doc.length, insert: formattedText },
        });

        // Restore cursor position after formatting
        try {
          const newState = editorView.state;
          const newDocLineCount = newState.doc.lines;
          if (cursorLineNumber <= newDocLineCount) {
            const newLine = newState.doc.line(cursorLineNumber);
            const newColumn = Math.min(cursorColumn, newLine.length);
            const newPos = newLine.from + newColumn;
            editorView.dispatch({ selection: { anchor: newPos, head: newPos } });
          }
        } catch (_selectionError) {
          editorView.dispatch({ selection: { anchor: 0, head: 0 } });
        }
        editorView.scrollDOM.scrollTop = Math.min(
          scrollTop,
          editorView.scrollDOM.scrollHeight - editorView.scrollDOM.clientHeight,
        );
      }

      showToast("Document formatted", "default");
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      showToast(`Error formatting document: ${message}`, "error");
      console.error("Formatting error:", error);
    } finally {
      onClose();
    }
  };

  const handleInsertGitHubIssues = async () => {
    if (!editorView) {
      showToast("Editor not available", "error");
      onClose();
      return;
    }
    try {
      const github_user_id = prompt("Enter GitHub User ID:");
      if (!github_user_id) {
        onClose();
        return;
      }
      const issuesTaskList = await fetchGitHubIssuesTaskList(github_user_id);
      const state = editorView.state;
      const cursorPos = state.selection.main.head;

      editorView.dispatch({
        changes: { from: cursorPos, to: cursorPos, insert: issuesTaskList },
        selection: { anchor: cursorPos + issuesTaskList.length },
      });

      showToast(`Inserted GitHub issues for ${github_user_id}`, "success");
    } catch (error) {
      console.error("Error inserting GitHub issues:", error);
      showToast("Failed to insert GitHub issues", "error");
    } finally {
      onClose();
    }
  };

  const goToGitHubRepo = () => {
    window.open("https://github.com/unvalley/ephe", "_blank");
    onClose();
  };

  const cycleThemeThenClose = () => {
    cycleTheme();
    onClose();
  };

  const commandsList = (): CommandItem[] => {
    const list: CommandItem[] = [
      {
        id: "theme-toggle",
        name: `Switch to ${nextTheme} mode`,
        icon:
          nextTheme === COLOR_THEME.LIGHT ? (
            <SunIcon className="size-4 stroke-1" />
          ) : nextTheme === COLOR_THEME.DARK ? (
            <MoonIcon className="size-4 stroke-1" />
          ) : (
            <ComputerDesktopIcon className="size-4 stroke-1" />
          ),
        // shortcut: "⌘T",
        perform: cycleThemeThenClose,
      },
    ];

    list.push({
      id: "paper-mode",
      name: "Cycle paper mode",
      icon: <NewspaperIcon className="size-4 stroke-1" />,
      perform: cyclePaperModeThenClose,
    });

    list.push({
      id: "editor-width",
      name: "Toggle editor width",
      icon: <ViewColumnsIcon className="size-4 stroke-1" />,
      perform: toggleEditorWidthThenClose,
    });

    list.push({
      id: "font-family",
      name: "Change font",
      icon: <DocumentTextIcon className="size-4 stroke-1" />,
      perform: cycleFont,
    });
    if (editorContent) {
      list.push({
        id: "export-markdown",
        name: "Export markdown",
        icon: <DocumentIcon className="size-4 stroke-1" />,
        // shortcut: "⌘S",
        perform: handleExportMarkdown,
      });
    }

    if (editorView && formatterRef.current) {
      list.push({
        id: "format-document",
        name: "Format document",
        icon: <CodeBracketIcon className="size-4 stroke-1" />,
        shortcut: "⌘S",
        perform: handleFormatDocument,
      });
    }

    if (editorView) {
      list.push({
        id: "insert-github-issues",
        name: "Create GitHub issue list (Public Repos)",
        icon: <LinkIcon className="size-4 stroke-1" />,
        perform: handleInsertGitHubIssues,
      });
    }

    list.push({
      id: "open-tasks",
      name: "Open task modal",
      icon: <CheckCircleIcon className="size-4 stroke-1" />,
      perform: openTaskModal,
    });

    list.push({
      id: "open-snapshots",
      name: "Open snapshot modal",
      icon: <DocumentIcon className="size-4 stroke-1" />,
      perform: openSnapshotModal,
    });
    list.push({
      id: "github-repo",
      name: "Go to Ephe GitHub Repo",
      icon: <LinkIcon className="size-4 stroke-1" />,
      perform: goToGitHubRepo,
    });

    return list;
  };

  return (
    <>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity dark:bg-black/50"
            onClick={(e) => {
              // Only close if clicking on the backdrop itself, not its children
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }
            }}
            aria-hidden="true"
          />

          <Command
            role="dialog"
            label="Command Menu"
            className={
              "-translate-x-1/2 fixed top-[20%] left-1/2 z-50 w-[90vw] max-w-[640px] scale-100 transform overflow-hidden rounded-xl border border-neutral-200 bg-white opacity-100 shadow-2xl transition-all duration-100 dark:border-zinc-800 dark:bg-zinc-900"
            }
            onClick={(e) => {
              // Prevent clicks inside the command menu from closing it
              e.stopPropagation();
            }}
          >
            <div className="relative border-neutral-200 border-b dark:border-zinc-800">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="size-4 stroke-1" />
              </div>
              <Command.Input
                ref={inputRef}
                value={inputValue}
                onValueChange={setInputValue}
                placeholder="Type a command or search..."
                className="w-full border-none bg-transparent py-2.5 pr-3 pl-9 text-neutral-900 text-sm outline-none placeholder:text-neutral-400 focus:ring-0 dark:text-neutral-100 dark:placeholder:text-neutral-500" // focus:ring-0 でフォーカス時のリングを消去
                autoFocus
              />
            </div>

            <Command.List
              ref={listRef}
              className="scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent max-h-[min(60vh,350px)] overflow-y-auto p-2" // 高さを調整
            >
              <Command.Empty className="py-6 text-center text-neutral-500 text-sm dark:text-neutral-400">
                No results found.
              </Command.Empty>

              <Command.Group
                heading="Interface"
                className="mb-1 px-1 font-medium text-neutral-500 text-xs tracking-wider dark:text-neutral-400"
              >
                {commandsList()
                  .filter((cmd) => ["theme-toggle", "paper-mode", "editor-width", "font-family"].includes(cmd.id))
                  .map((command) => (
                    <Command.Item
                      key={command.id}
                      value={command.name}
                      onSelect={command.perform}
                      className="group mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-neutral-900 text-sm transition-colors hover:bg-neutral-100 aria-selected:bg-primary-500/10 aria-selected:text-primary-600 dark:text-neutral-100 dark:aria-selected:bg-primary-500/20 dark:aria-selected:text-primary-400 dark:hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-neutral-100/80 text-neutral-900 transition-colors group-hover:bg-neutral-200 group-aria-selected:bg-primary-500/20 dark:bg-zinc-700/60 dark:text-neutral-100 dark:group-aria-selected:bg-primary-600/20 dark:group-hover:bg-zinc-600">
                          {command.icon}
                        </div>
                        <span className="flex-grow truncate">
                          {" "}
                          {command.name}
                          {command.id === "paper-mode" && currentPaperMode && (
                            <span className="ml-1.5 text-neutral-500 text-xs dark:text-neutral-400">
                              ({currentPaperMode})
                            </span>
                          )}
                          {command.id === "editor-width" && currentEditorWidth && (
                            <span className="ml-1.5 text-neutral-500 text-xs dark:text-neutral-400">
                              ({currentEditorWidth})
                            </span>
                          )}
                          {command.id === "font-family" && (
                            <span className="ml-1.5 text-neutral-500 text-xs dark:text-neutral-400">
                              ({FONT_FAMILIES[fontFamily].displayValue})
                            </span>
                          )}
                        </span>
                      </div>
                      {command.shortcut && (
                        <kbd className="hidden flex-shrink-0 select-none rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-medium text-neutral-500 text-xs group-hover:border-neutral-300 sm:inline-block dark:border-zinc-700 dark:bg-zinc-800 dark:text-neutral-400">
                          {command.shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  ))}
              </Command.Group>

              <Command.Group
                heading="Operations"
                className="mb-1 px-1 font-medium text-neutral-500 text-xs tracking-wider dark:text-neutral-400"
              >
                {commandsList()
                  .filter((cmd) =>
                    [
                      "export-markdown",
                      "format-document",
                      "insert-github-issues",
                      "open-tasks",
                      "open-snapshots",
                    ].includes(cmd.id),
                  )
                  .map((command) => (
                    <Command.Item
                      key={command.id}
                      value={command.name}
                      onSelect={command.perform}
                      className="group mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-neutral-900 text-sm transition-colors hover:bg-neutral-100 aria-selected:bg-primary-500/10 aria-selected:text-primary-600 dark:text-neutral-100 dark:aria-selected:bg-primary-500/20 dark:aria-selected:text-primary-400 dark:hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-neutral-100/80 text-neutral-900 transition-colors group-hover:bg-neutral-200 group-aria-selected:bg-primary-500/20 dark:bg-zinc-700/60 dark:text-neutral-100 dark:group-aria-selected:bg-primary-600/20 dark:group-hover:bg-zinc-600">
                          {command.icon}
                        </div>
                        <span className="flex-grow truncate">{command.name}</span>
                      </div>
                      {command.shortcut && (
                        <kbd className="hidden flex-shrink-0 select-none rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-medium text-neutral-500 text-xs group-hover:border-neutral-300 sm:inline-block dark:border-zinc-700 dark:bg-zinc-800 dark:text-neutral-400">
                          {command.shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  ))}
              </Command.Group>

              <Command.Group
                heading="Navigation"
                className="mb-1 px-1 font-medium text-neutral-500 text-xs tracking-wider dark:text-neutral-400"
              >
                {commandsList()
                  .filter((cmd) => ["github-repo", "history"].includes(cmd.id))
                  .map((command) => (
                    <Command.Item
                      key={command.id}
                      value={command.name}
                      onSelect={command.perform}
                      className="group mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-neutral-900 text-sm transition-colors hover:bg-neutral-100 aria-selected:bg-primary-500/10 aria-selected:text-primary-600 dark:text-neutral-100 dark:aria-selected:bg-primary-500/20 dark:aria-selected:text-primary-400 dark:hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-neutral-100/80 text-neutral-900 transition-colors group-hover:bg-neutral-200 group-aria-selected:bg-primary-500/20 dark:bg-zinc-700/60 dark:text-neutral-100 dark:group-aria-selected:bg-primary-600/20 dark:group-hover:bg-zinc-600">
                          {command.icon}
                        </div>
                        <span className="flex-grow truncate">{command.name}</span>
                      </div>
                      {command.shortcut && (
                        <kbd className="hidden flex-shrink-0 select-none rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-medium text-neutral-500 text-xs group-hover:border-neutral-300 sm:inline-block dark:border-zinc-700 dark:bg-zinc-800 dark:text-neutral-400">
                          {command.shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  ))}
              </Command.Group>
            </Command.List>

            <div className="flex items-center justify-between border-neutral-200 border-t px-3 py-2 text-neutral-500 text-xs dark:border-zinc-800 dark:text-neutral-400">
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-medium text-neutral-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-neutral-400">
                  ⌘
                </kbd>
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-medium text-neutral-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-neutral-400">
                  k
                </kbd>
                <span className="ml-1">to close</span>
              </div>
            </div>
          </Command>
        </>
      )}
    </>
  );
};
