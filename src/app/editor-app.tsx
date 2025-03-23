"use client";

import { useRef, useState, useEffect, useCallback, lazy, Suspense } from "react";
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
import { Footer } from "../components/footer";
import { ToastContainer, showToast } from "../components/toast";
import { createAutoSnapshot } from "../features/snapshots/snapshot-manager";
import { getSnapshots } from "../features/snapshots/snapshot-storage";

const markdownExtension = new MonacoMarkdownExtension();

// スナップショットダイアログを遅延ロード
const SnapshotDialog = lazy(() =>
  import("../components/snapshot-dialog").then((module) => ({ default: module.SnapshotDialog })),
);

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
  const [editorContent, setEditorContent] = useState<string>(
    typeof localStorageContent === "string" ? localStorageContent : "",
  );

  // Add state to track snapshot dialog
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);

  const createAutoSave = (content: string) => {
    if (!content || content.trim().length === 0) return;

    // Check if the latest snapshot was created within the last 10 minutes
    const snapshots = getSnapshots();
    const latestSnapshot = snapshots[0];
    if (latestSnapshot && new Date().getTime() - new Date(latestSnapshot.timestamp).getTime() < 10 * 60 * 1000) {
      return;
    }

    createAutoSnapshot({
      content,
      title: new Date().toLocaleString(), // TODO: use random name
      description: "Automatically created when leaving the editor",
    });

    showToast("Snapshot saved successfully", "success");
  };

  // Create a snapshot when the editor is blurred
  useEffect(() => {
    const handleBlur = () => {
      if (editorRef.current) {
        const content = editorRef.current.getValue();
        createAutoSave(content);
      }
    };

    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

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
            editorContent={editorContent}
            open={commandMenuOpen}
            onClose={() => setCommandMenuOpen(false)}
            onOpen={() => setCommandMenuOpen(true)}
          />
        </div>
      </div>
      <Footer charCount={charCount} />

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
