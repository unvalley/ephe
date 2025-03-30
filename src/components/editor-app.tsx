"use client";

import { useRef, useState, useCallback, Suspense, useEffect } from "react";
import { useTheme } from "../hooks/use-theme";
import type * as monaco from "monaco-editor";
import { useLocalStorage } from "../hooks/use-local-storage";
import { useDebouncedCallback } from "../hooks/use-debounce";
import { EDITOR_CONTENT_KEY, getRandomQuote } from "../features/monaco";
import { isTaskLine, isClosedTaskLine } from "../features/monaco/task-list-utils";
import { Editor } from "@monaco-editor/react";
import { CommandMenu } from "./command-k";
import { TableOfContents, TableOfContentsButton } from "./table-of-contents";
import {
  editorOptions,
  handleKeyDown,
  handleTaskCheckboxToggle,
  updatePlaceholder,
  applyTaskCheckboxDecorations,
  epheLight,
  epheDark,
} from "../features/monaco/editor-utils";
import { MonacoMarkdownExtension } from "../monaco-markdown";
import {
  applyHeadingFoldDecorations,
  registerHeadingFoldClickHandler,
  registerFoldingStateListeners,
} from "../features/monaco/heading-fold-decorator";
import { Footer } from "./footer";
import { ToastContainer, showToast } from "./toast";
import { createAutoSnapshot } from "../features/snapshots/snapshot-manager";
import { SnapshotDialog } from "./snapshot-dialog";
import { DprintMarkdownFormatter } from "../features/markdown/dprint-markdown-formatter";
import type { MarkdownFormatter } from "../features/markdown/markdown-formatter";

const markdownExtension = new MonacoMarkdownExtension();

export const EditorApp = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const formatterRef = useRef<MarkdownFormatter | null>(null);

  const [charCount, setCharCount] = useState<number>(0);
  const [taskCount, setTaskCount] = useState<{ open: number; closed: number }>({ open: 0, closed: 0 });

  const [localStorageContent, setLocalStorageContent] = useLocalStorage<string>(EDITOR_CONTENT_KEY, "");
  const [placeholder, _] = useState<string>(getRandomQuote());
  const [isTocVisible, setIsTocVisible] = useState<boolean>(true);

  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [loadingEditor, setLoadingEditor] = useState(true);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  useEffect(() => {
    const initMarkdownFormatter = async () => {
      try {
        const formatter = await DprintMarkdownFormatter.getInstance();
        formatterRef.current = formatter;
      } catch (error) {
        console.error("Failed to initialize markdown formatter:", error);
      }
    };
    initMarkdownFormatter();

    return () => {
      formatterRef.current = null;
    };
  }, []);

  // Focus the editor when clicking anywhere in the page container
  const handlePageClick = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const debouncedSetContent = useDebouncedCallback((content: string) => {
    setLocalStorageContent(content);
  }, 300);

  const debouncedCharCountUpdate = useDebouncedCallback(
    (content: string) => {
      setCharCount(content.length);
    },
    50, // Faster updates for character count
  );

  const debouncedTaskCountUpdate = useDebouncedCallback((content: string) => {
    countTasks(content);
  }, 100);

  const [editorContent, setEditorContent] = useState<string>(
    typeof localStorageContent === "string" ? localStorageContent : "",
  );

  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);

  const countTasks = (content: string) => {
    if (!content) {
      setTaskCount({ open: 0, closed: 0 });
      return;
    }

    const lines = content.split("\n");
    let openCount = 0;
    let closedCount = 0;

    for (const line of lines) {
      if (isTaskLine(line)) {
        if (isClosedTaskLine(line)) {
          closedCount++;
        } else {
          openCount++;
        }
      }
    }

    setTaskCount({ open: openCount, closed: closedCount });
  };

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

    // Register heading fold click handler
    registerHeadingFoldClickHandler(editor);

    // Register folding state listeners
    registerFoldingStateListeners(editor);

    // Add key binding for Cmd+S / Ctrl+S to save and create snapshot
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Force save to localStorage
      const value = editor.getValue();
      setLocalStorageContent(value);

      // Create automatic snapshot on save
      createAutoSnapshot({
        content: value,
        title: new Date().toLocaleString(), // TODO: use random name
        description: "Manually saved from command menu",
      });

      showToast("Snapshot saved successfully", "success");
    });

    // Add key binding for Cmd+K / Ctrl+K to open the command menu
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      setCommandMenuOpen((prev) => !prev);
    });

    // Add key binding for Cmd+Shift+S / Ctrl+Shift+S to open custom snapshot dialog
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
      setSnapshotDialogOpen(true);
    });

    // Add keyboard shortcuts for folding/unfolding
    // Cmd/Ctrl + [ to fold
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketLeft, () => {
      editor.trigger("keyboard", "editor.fold", null);
      // Update heading fold decorations after folding
      setTimeout(() => applyHeadingFoldDecorations(editor, editor.getModel()), 100);
    });

    // Cmd/Ctrl + ] to unfold
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight, () => {
      editor.trigger("keyboard", "editor.unfold", null);
      // Update heading fold decorations after unfolding
      setTimeout(() => applyHeadingFoldDecorations(editor, editor.getModel()), 100);
    });

    // Cmd/Ctrl + Shift + [ to fold all
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketLeft, () => {
      editor.trigger("keyboard", "editor.foldAll", null);
      // Update heading fold decorations after folding all
      setTimeout(() => applyHeadingFoldDecorations(editor, editor.getModel()), 100);
    });

    // Cmd/Ctrl + Shift + ] to unfold all
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketRight, () => {
      editor.trigger("keyboard", "editor.unfoldAll", null);
      // Update heading fold decorations after unfolding all
      setTimeout(() => applyHeadingFoldDecorations(editor, editor.getModel()), 100);
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
          if (isTaskLine(lineContent)) {
            // Add decoration for completed tasks
            if (isClosedTaskLine(lineContent)) {
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

        // Apply task decorations
        applyTaskCheckboxDecorations(editor, model);

        // Apply heading fold decorations
        applyHeadingFoldDecorations(editor, model);
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
      if (!model) return;

      // TODO: Instead of processing line by line, use a markdown parser library
      // to perform operations more efficiently with a single parse

      updatePlaceholder(value);
      updateDecorations(model);
      debouncedTaskCountUpdate(value);

      debouncedCharCountUpdate(value);
      debouncedSetContent(value);
      setEditorContent(value);
    });

    // Initialize decorations on mount
    applyTaskCheckboxDecorations(editor, editor.getModel());

    // Initial setup
    updatePlaceholder(editor.getValue());
    updateDecorations(editor.getModel());

    // Initial character count and task count - direct calculation for initial load
    const initialContent = editor.getValue();
    setCharCount(initialContent.length);
    countTasks(initialContent);

    // Focus editor on mount
    editor.focus();

    monaco.editor.defineTheme(epheLight.name, epheLight.theme);
    monaco.editor.defineTheme(epheDark.name, epheDark.theme);
    monaco.editor.setTheme(isDarkMode ? epheDark.name : epheLight.name);
  };

  // Determine if placeholder should be visible initially
  const shouldShowPlaceholder = !loadingEditor && (!localStorageContent || !localStorageContent.trim());

  // Handle TOC item click
  const handleTocItemClick = useCallback((line: number) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line + 1);
      editorRef.current.setPosition({ lineNumber: line + 1, column: 1 });
      editorRef.current.focus();
    }
  }, []);

  // Toggle TOC visibility
  const toggleToc = useCallback(() => {
    setIsTocVisible(!isTocVisible);
  }, [isTocVisible]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents:
    <div className="h-screen w-screen flex flex-col" onClick={handlePageClick}>
      <div className="flex-1 pt-16 pb-8 overflow-hidden">
        <div className="mx-auto h-full max-w-5xl">
          <div className="flex justify-center h-full">
            <div className="w-full max-w-2xl px-4 sm:px-6 md:px-2 relative">
              <div
                className="relative h-full"
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  className={`absolute text-gray-400 dark:text-gray-500 pointer-events-none z-20 transition-opacity duration-300 font-mono text-sm ${shouldShowPlaceholder ? "opacity-100" : "opacity-0"}`}
                  style={{
                    left: "18px",
                    top: "12px",
                    lineHeight: "1.5",
                  }}
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
                  }}
                  onMount={handleEditorDidMount}
                  className="overflow-visible h-full"
                  loading="loading..."
                  theme={isDarkMode ? "ephe-dark" : "ephe-light"}
                />
              </div>

              {/* Only show TOC when there is content */}
              {editorContent.trim() && (
                <>
                  <TableOfContentsButton isVisible={isTocVisible} toggleToc={toggleToc} />
                  <div className={`toc-wrapper ${isTocVisible ? "visible" : "hidden"}`}>
                    <TableOfContents
                      isVisible={isTocVisible}
                      content={editorContent}
                      onItemClick={handleTocItemClick}
                    />
                  </div>
                </>
              )}

              <CommandMenu
                editorContent={editorContent}
                open={commandMenuOpen}
                onClose={() => setCommandMenuOpen(false)}
                onOpen={() => setCommandMenuOpen(true)}
                editorRef={editorRef}
                markdownFormatterRef={formatterRef}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer charCount={charCount} taskCount={taskCount} />

      {snapshotDialogOpen && (
        <Suspense fallback={<div className="loading-spinner" />}>
          <SnapshotDialog
            isOpen={snapshotDialogOpen}
            onClose={() => setSnapshotDialogOpen(false)}
            editorContent={editorContent}
          />
        </Suspense>
      )}

      <ToastContainer />
    </div>
  );
};
