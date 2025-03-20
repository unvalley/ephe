"use client";

import Avatar from "boring-avatars";
import { useRef, memo, useState } from "react";
import { useTheme } from "../hooks/use-theme";
import type * as monaco from "monaco-editor";
import { useLocalStorage } from "../hooks/use-local-storage";
import { useDebouncedCallback } from "../hooks/use-debounce";
import { EDITOR_CONTENT_KEY, getRandomQuote } from "../features/monaco";
import { isTaskListLine, isCheckedTask } from "../features/monaco/task-list-utils";
import { Editor } from "@monaco-editor/react";
import { CommandMenu } from "../components/command-k";
import { TableOfContents, TableOfContentsButton } from "../components/toc";
import {
  editorOptions,
  handleKeyDown,
  handleTaskCheckboxToggle,
  updatePlaceholder,
  applyTaskCheckboxDecorations,
} from "../features/monaco/editor-utils";
import { MonacoMarkdownExtension } from "../monaco-markdown";

const EPHE_VERSION = "0.0.1";

const markdownExtension = new MonacoMarkdownExtension();

export const EditorApp = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const [charCount, setCharCount] = useState<number>(0);

  // Focus the editor when clicking anywhere in the page container
  const handlePageClick = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const [localStorageContent, setLocalStorageContent] = useLocalStorage<string>(EDITOR_CONTENT_KEY, "");

  const [placeholder, _] = useState<string>(getRandomQuote());
  const [isTocVisible, setIsTocVisible] = useState<boolean>(true);

  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [loadingEditor, setLoadingEditor] = useState(true);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  const debouncedSetContent = useDebouncedCallback((newContent: string) => {
    setLocalStorageContent(newContent);
  }, 300);

  const debouncedCharCountUpdate = useDebouncedCallback(
    (text: string) => {
      setCharCount(text.length);
    },
    50, // Faster updates for character count
  );

  // Add state to track editor content
  const [editorContent, setEditorContent] = useState<string>(localStorageContent);

  // Handle editor mounting
  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor"),
  ) => {
    if (editorRef) {
      editorRef.current = editor;
    }
    setLoadingEditor(false);

    // Initialize markdown extension
    markdownExtension.activate(editor);

    // Add key binding for Cmd+S / Ctrl+S to prevent browser save dialog
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Force save to localStorage
      const value = editor.getValue();
      setLocalStorageContent(value);
    });

    // Add key binding for Cmd+K / Ctrl+K to open the command menu
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      setCommandMenuOpen((prev) => !prev);
    });

    // Add decorations for checked tasks
    const updateDecorations = (model: monaco.editor.ITextModel | null) => {
      if (!model) return;
      try {
        const oldDecorations = model.getAllDecorations() || [];
        const decorations: monaco.editor.IModelDeltaDecoration[] = [];

        for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
          const lineContent = model.getLineContent(lineNumber);

          // Only process task list lines
          if (isTaskListLine(lineContent)) {
            // Add decoration for completed tasks
            if (isCheckedTask(lineContent)) {
              decorations.push({
                range: new monaco.Range(
                  lineNumber,
                  1, // Start from beginning of line
                  lineNumber,
                  lineContent.length + 1, // To the end of the line
                ),
                options: {
                  inlineClassName: "task-completed-line",
                  isWholeLine: true,
                  stickiness: monaco.editor.TrackedRangeStickiness.GrowsOnlyWhenTypingBefore,
                },
              });
            }
          }
        }

        const oldIds = oldDecorations
          .filter((d) => d.options.inlineClassName === "task-completed-line")
          .map((d) => d.id);

        editor.deltaDecorations(oldIds, decorations);

        // Add call to createTaskCheckboxDecorations to handle checkbox hover styles
        applyTaskCheckboxDecorations(editor, model);
      } catch (error) {
        console.error("Error updating decorations:", error);
      }
    };

    // Add event handlers
    editor.onKeyDown((event) => handleKeyDown(event, editor, editor.getModel(), editor.getPosition()));
    editor.onMouseDown((event) => handleTaskCheckboxToggle(event, editor, editor.getModel()));

    // Update editor content state when content changes
    editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      const model = editor.getModel();

      setEditorContent(value);
      updatePlaceholder(value);
      updateDecorations(model);
      debouncedSetContent(value);
      debouncedCharCountUpdate(value);
    });

    // Initialize decorations on mount
    applyTaskCheckboxDecorations(editor, editor.getModel());

    // Initial setup
    updatePlaceholder(editor.getValue());
    updateDecorations(editor.getModel());

    // Initial character count - direct calculation for initial load
    setCharCount(editor.getValue().length);

    // Focus editor on mount
    editor.focus();

    // Define custom themes
    monaco.editor.defineTheme("ephe-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#8a9aa9", fontStyle: "italic" },
        { token: "keyword", foreground: "#5d5080" },
        { token: "string", foreground: "#457464" },
        { token: "number", foreground: "#a37a55" },
        { token: "type", foreground: "#44678a" },
        { token: "function", foreground: "#4a768f" },
        { token: "variable", foreground: "#566370" },
        { token: "constant", foreground: "#9e6b60" },
        { token: "operator", foreground: "#6d5e96" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#3a4550",
      },
    });

    monaco.editor.defineTheme("ephe-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#8a9aa9", fontStyle: "italic" },
        { token: "keyword", foreground: "#a08cc0" },
        { token: "string", foreground: "#7fb49a" },
        { token: "number", foreground: "#c79d7f" },
        { token: "type", foreground: "#7a9cbf" },
        { token: "function", foreground: "#7c9cb3" },
        { token: "variable", foreground: "#d6d9dd" },
        { token: "constant", foreground: "#c99a90" },
        { token: "operator", foreground: "#a99ac6" },
      ],
      colors: {
        "editor.background": "#121212",
        "editor.foreground": "#d6d9dd",
      },
    });
    // Apply custom theme
    monaco.editor.setTheme(isDarkMode ? "ephe-dark" : "ephe-light");
  };

  // Determine if placeholder should be visible initially
  const shouldShowPlaceholder = !loadingEditor && (!localStorageContent || !localStorageContent.trim());

  // Handle TOC item click
  const handleTocItemClick = (line: number) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line + 1);
      editorRef.current.setPosition({ lineNumber: line + 1, column: 1 });
      editorRef.current.focus();
    }
  };

  // Toggle TOC visibility
  const toggleToc = () => {
    setIsTocVisible(!isTocVisible);
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents:
    <div className="h-screen w-screen flex flex-col justify-center" onClick={handlePageClick}>
      <div className="flex-1 flex-row pt-16 pb-8">
        <div className="w-full max-w-5xl mx-auto relative h-full">
          <>
            <div className="flex justify-center relative h-full">
              {/* Editor container */}
              <div className="w-full max-w-2xl relative px-4 sm:px-6 md:px-2">
                <div
                  className={`text-md absolute left-0.5 top-1 text-gray-400 dark:text-gray-500 pointer-events-none z-[1] transition-opacity duration-300 px-4 sm:px-2 ${shouldShowPlaceholder ? "opacity-100" : "opacity-0"}`}
                  aria-hidden={!shouldShowPlaceholder}
                >
                  {placeholder}
                </div>
                <Editor
                  height="100%"
                  width="100%"
                  defaultLanguage="markdown"
                  defaultValue={localStorageContent}
                  options={{
                    ...editorOptions,
                    padding: { top: 4 }, // Add padding to prevent cursor from being cut off
                  }}
                  onMount={handleEditorDidMount}
                  className="overflow-visible"
                  loading=""
                  theme={isDarkMode ? "ephe-dark" : "ephe-light"}
                />
              </div>
            </div>

            {/* Only show TOC when there is content */}
            {editorContent.trim() && (
              <>
                <TableOfContentsButton isVisible={isTocVisible} toggleToc={toggleToc} />
                <div className={`toc-wrapper ${isTocVisible ? "visible" : "hidden"}`}>
                  <TableOfContents isVisible={isTocVisible} content={editorContent} onItemClick={handleTocItemClick} />
                </div>
              </>
            )}

            <CommandMenu
              open={commandMenuOpen}
              onClose={() => setCommandMenuOpen(false)}
              onOpen={() => setCommandMenuOpen(true)}
            />
          </>
        </div>
      </div>
      <MemoizedEditorFooter charCount={charCount} />
    </div>
  );
};

type EditorFooterProps = {
  charCount: number;
};

const EditorFooter = ({ charCount }: EditorFooterProps) => {
  const { toggleTheme, toggleTargetTheme } = useTheme();

  return (
    <footer className="fixed inset-x-0 bottom-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm space-mono">
      <div className="mx-auto px-2 py-0.5 text-sm text-gray-600 dark:text-gray-400 flex justify-between">
        <nav className="flex gap-4">
          <a href="/landing" className="hover:text-gray-900 dark:hover:text-gray-100">
            Home
          </a>
          <a
            href="https://github.com/unvalley/ephe"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900 dark:hover:text-gray-100"
          >
            GitHub
          </a>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleTheme();
            }}
            className="hover:text-gray-900 dark:hover:text-gray-100"
            aria-label={`Switch to ${toggleTargetTheme} mode`}
          >
            {toggleTargetTheme === "light" ? "Light" : "Dark"}
          </button>
        </nav>
        <div className="flex items-center space-x-2 min-w-0">
          <span className="text-gray-500 whitespace-nowrap">{charCount} chars</span>
          <Avatar
            size={12}
            name="Georgia O"
            colors={["#6c788e", "#a6aec1", "#cfd5e1", "#ededf2", "#fcfdff"]}
            variant="marble"
            className="flex-shrink-0"
          />
          <span className="whitespace-nowrap">Ephe v{EPHE_VERSION}</span>
        </div>
      </div>
    </footer>
  );
};

// Memoize the footer to prevent unnecessary re-renders
const MemoizedEditorFooter = memo(EditorFooter);
