"use client";

import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../utils/hooks/use-theme";
import type { MarkdownFormatter } from "../editor/markdown/formatter/markdown-formatter";
import { showToast } from "../../utils/components/toast";
import type { PaperMode } from "../../utils/hooks/use-paper-mode";
import { COLOR_THEME, type ColorTheme } from "../../utils/theme-initializer";
import type { EditorWidth } from "../../utils/hooks/use-editor-width";
import {
  ComputerDesktopIcon,
  DocumentIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  NewspaperIcon,
  SunIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";

type CommandMenuProps = {
  open: boolean;
  onClose?: () => void;
  editorContent?: string;
  //   editorRef?: React.RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  markdownFormatterRef?: React.RefObject<MarkdownFormatter | null>;
  paperMode?: PaperMode;
  cyclePaperMode?: () => PaperMode;
  editorWidth?: EditorWidth;
  toggleEditorWidth?: () => void;
  previewMode?: boolean;
  togglePreviewMode?: () => void;
};

type CommandItem = {
  id: string;
  name: string;
  icon?: React.ReactNode;
  shortcut?: string;
  perform: () => void;
  keywords?: string;
};

export function CommandMenu({
  open,
  onClose = () => {},
  editorContent = "",
  //   markdownFormatterRef,
  paperMode,
  cyclePaperMode,
  editorWidth,
  toggleEditorWidth,
}: CommandMenuProps) {
  const { theme, setTheme, nextTheme } = useTheme();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        setInputValue("");
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const cycleThemeCallback = () => {
    let nextTheme: ColorTheme;
    if (theme === COLOR_THEME.LIGHT) {
      nextTheme = COLOR_THEME.DARK;
    } else if (theme === COLOR_THEME.DARK) {
      nextTheme = COLOR_THEME.SYSTEM;
    } else {
      nextTheme = COLOR_THEME.LIGHT;
    }
    setTheme(nextTheme);
    onClose();
  };

  const getNextThemeText = () => {
    if (theme === COLOR_THEME.LIGHT) return "dark";
    if (theme === COLOR_THEME.DARK) return "system";
    return "light";
  };

  const cyclePaperModeCallback = () => {
    cyclePaperMode?.();
    onClose();
  };

  const toggleEditorWidthCallback = () => {
    toggleEditorWidth?.();
    onClose();
  };

  const handleExportMarkdownCallback = () => {
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

  //   const handleFormatDocumentCallback = useCallback(async () => {
  //     if (!editorRef?.current || !markdownFormatterRef?.current) {
  //       showToast("Editor or markdown formatter not available", "error");
  //       handleClose();
  //       return;
  //     }
  //     try {
  //       const editor = editorRef.current;
  //       const selection = editor.getSelection();
  //       const scrollTop = editor.getScrollTop();
  //       const content = editor.getValue();
  //       const formattedContent = await markdownFormatterRef.current.formatMarkdown(content); // formatMarkdownはPromiseを返すと仮定

  //       editor.setValue(formattedContent);

  //       // カーソル位置とスクロール位置を復元
  //       if (selection) {
  //         editor.setSelection(selection);
  //       }
  //       // setValue後のレンダリングを待ってからスクロール位置を復元
  //       setTimeout(() => editor.setScrollTop(scrollTop), 0);

  //       showToast("Document formatted successfully", "default");
  //     } catch (error) {
  //       const message = error instanceof Error ? error.message : "unknown";
  //       showToast(`Error formatting document: ${message}`, "error");
  //       console.error("Formatting error:", error);
  //     } finally {
  //       handleClose();
  //     }
  //   }, [markdownFormatterRef, handleClose]);

  //   const handleInsertGitHubIssuesCallback = useCallback(async () => {
  //     if (!editorRef?.current) {
  //       showToast("Editor not available", "error");
  //       handleClose();
  //       return;
  //     }
  //     try {
  //       const github_user_id = prompt("Enter GitHub User ID:");
  //       if (!github_user_id) {
  //         handleClose(); // キャンセルまたは空入力時は閉じる
  //         return;
  //       }
  //       const issuesTaskList = await fetchGitHubIssuesTaskList(github_user_id); // fetchGitHubIssuesTaskListはPromiseを返すと仮定
  //       const editor = editorRef.current;
  //       const selection = editor.getSelection();
  //       const position = editor.getPosition();

  //       let range: monaco.IRange;
  //       if (selection && !selection.isEmpty()) {
  //         range = selection;
  //       } else if (position) {
  //         // 選択範囲がない場合は現在のカーソル位置に挿入
  //         range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
  //       } else {
  //         // カーソル位置もない場合（エディタが空など）は先頭に挿入
  //         range = new monaco.Range(1, 1, 1, 1);
  //       }

  //       editor.executeEdits("insert-github-issues", [{ range, text: issuesTaskList, forceMoveMarkers: true }]);

  //       showToast(`Inserted GitHub issues for ${github_user_id}`, "success");
  //     } catch (error) {
  //       console.error("Error inserting GitHub issues:", error);
  //       showToast("Failed to insert GitHub issues", "error");
  //     } finally {
  //       handleClose();
  //     }
  //   }, [editorRef, handleClose]);

  const goToGitHubRepo = () => {
    window.open("https://github.com/unvalley/ephe", "_blank");
    onClose();
  };

  const commandsList = (): CommandItem[] => {
    const list: CommandItem[] = [
      {
        id: "theme-toggle",
        name: `Switch to ${getNextThemeText()} mode`,
        icon:
          nextTheme === COLOR_THEME.LIGHT ? (
            <SunIcon className="size-4 stroke-1" />
          ) : nextTheme === COLOR_THEME.DARK ? (
            <MoonIcon className="size-4 stroke-1" />
          ) : (
            <ComputerDesktopIcon className="size-4 stroke-1" />
          ),
        // shortcut: "⌘T", // Mac以外も考慮するなら修飾キーの表示を工夫する必要あり
        perform: cycleThemeCallback,
        keywords: "theme toggle switch mode light dark system color appearance",
      },
    ];

    if (cyclePaperMode) {
      list.push({
        id: "paper-mode",
        name: "Cycle paper mode",
        icon: <NewspaperIcon className="size-4 stroke-1" />,
        perform: cyclePaperModeCallback,
        keywords: "paper mode cycle switch document style layout background",
      });
    }
    if (toggleEditorWidth) {
      list.push({
        id: "editor-width",
        name: "Toggle editor width",
        icon: <ViewColumnsIcon className="size-4 stroke-1" />,
        perform: toggleEditorWidthCallback,
        keywords: "editor width toggle resize narrow wide full layout column",
      });
    }
    if (editorContent) {
      list.push({
        id: "export-markdown",
        name: "Export markdown",
        icon: <DocumentIcon className="size-4 stroke-1" />,
        // shortcut: "⌘S",
        perform: handleExportMarkdownCallback,
        keywords: "export markdown save download file md text document",
      });
    }
    // if (editorRef?.current && markdownFormatterRef?.current) {
    //   list.push({
    //     id: "format-document",
    //     name: "Format document",
    //     icon: <FormatIcon className="h-3.5 w-3.5" />,
    //     shortcut: "⌘F", // ブラウザの検索と競合する可能性あり
    //     perform: handleFormatDocumentCallback,
    //     keywords: "format document prettify code style arrange beautify markdown lint tidy",
    //   });
    // }
    // if (editorRef?.current) {
    //   // エディタが存在する場合のみ表示
    //   list.push({
    //     id: "insert-github-issues",
    //     name: "Insert GitHub Issues (Public Repos)",
    //     icon: <GitHubIcon className="h-3.5 w-3.5" />,
    //     shortcut: "⌘G", // ショートカットは要検討
    //     perform: handleInsertGitHubIssuesCallback,
    //     keywords: "github issues insert fetch task todo list import integrate",
    //   });
    // }
    list.push({
      id: "github-repo",
      name: "Go to Ephe GitHub Repo",
      icon: <LinkIcon className="size-4 stroke-1" />,
      perform: goToGitHubRepo,
      keywords: "github ephe repository project code source link open website source-code",
    });

    return list;
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity dark:bg-black/50"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          aria-hidden="true"
        />
      )}

      <Command
        role="dialog"
        label="Command Menu"
        className={`-translate-x-1/2 fixed top-[20%] left-1/2 z-50 w-[90vw] max-w-[640px] transform overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl transition-all duration-100 dark:border-zinc-800 dark:bg-zinc-900 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
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
            heading="Interface Mode"
            className="mb-1 px-1 font-medium text-neutral-500 text-xs tracking-wider dark:text-neutral-400"
          >
            {commandsList()
              .filter((cmd) => ["theme-toggle", "paper-mode", "editor-width"].includes(cmd.id))
              .map((command) => (
                <Command.Item
                  key={command.id}
                  // value に name と keywords を含めて検索対象にする
                  value={`${command.name} ${command.keywords || ""}`}
                  onSelect={command.perform}
                  className="group mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-neutral-900 text-sm transition-colors hover:bg-neutral-100 aria-selected:bg-primary-500/10 aria-selected:text-primary-600 dark:text-neutral-100 dark:aria-selected:bg-primary-500/20 dark:aria-selected:text-primary-400 dark:hover:bg-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    {/* アイコン表示エリア */}
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-neutral-100/80 text-neutral-900 transition-colors group-hover:bg-neutral-200 group-aria-selected:bg-primary-500/20 dark:bg-zinc-700/60 dark:text-neutral-100 dark:group-aria-selected:bg-primary-600/20 dark:group-hover:bg-zinc-600">
                      {command.icon}
                    </div>
                    {/* コマンド名と状態表示 */}
                    <span className="flex-grow truncate">
                      {" "}
                      {command.name}
                      {command.id === "paper-mode" && paperMode && (
                        <span className="ml-1.5 text-neutral-500 text-xs dark:text-neutral-400">({paperMode})</span>
                      )}
                      {command.id === "editor-width" && editorWidth && (
                        <span className="ml-1.5 text-neutral-500 text-xs dark:text-neutral-400">({editorWidth})</span>
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
            heading="Operations (WIP)"
            className="mb-1 px-1 font-medium text-neutral-500 text-xs tracking-wider dark:text-neutral-400"
          >
            {commandsList()
              .filter((cmd) => ["export-markdown", "format-document", "insert-github-issues"].includes(cmd.id))
              .map((command) => (
                <Command.Item
                  key={command.id}
                  value={`${command.name} ${command.keywords || ""}`}
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
                  value={`${command.name} ${command.keywords || ""}`}
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
  );
}
