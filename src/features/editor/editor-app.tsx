"use client";

import type * as monaco from "monaco-editor";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "../../hooks/use-theme";
import { useLocalStorage } from "../../hooks/use-local-storage";
import { useDebouncedCallback } from "use-debounce";
import { useTabDetection } from "../../hooks/use-tab-detection";
import { usePaperMode } from "../../hooks/use-paper-mode";
import { useEditorWidth } from "../../hooks/use-editor-width";
import { CommandMenu } from "../command/command-k";
import { getRandomQuote } from "./quotes";
import { SnapshotDialog } from "../snapshots/snapshot-dialog";
import {
  handleKeyDown,
  applyTaskCheckboxDecorations,
  editorOptions,
  EPHE_DARK_THEME,
  EPHE_LIGHT_THEME,
} from "./monaco/editor-utils";
import { Footer } from "../../components/footer";
import { Loading } from "../../components/loading";
import { handleTaskCheckboxToggle } from "./monaco/editor-utils";
import { DprintMarkdownFormatter } from "./markdown/formatter/dprint-markdown-formatter";
import type { MarkdownFormatter } from "./markdown/formatter/markdown-formatter";
import { MonacoMarkdownExtension } from "./monaco/monaco-markdown";
import { markdownService, type TaskListCount } from "./markdown/ast/markdown-service";
import { AlreadyOpenDialog } from "../../components/already-open-dialog";
import { PlaceholderWidget } from "./monaco/placeholder-widget";
import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { saveSnapshot } from "../snapshots/snapshot-storage";
import { useToc } from "../toc/toc-context";
import { TableOfContents } from "./table-of-contents";
import { showToast } from "../../components/toast";

export const EditorApp = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const formatterRef = useRef<MarkdownFormatter | null>(null);
  const placeholderRef = useRef<PlaceholderWidget | null>(null);

  const [charCount, setCharCount] = useState<number>(0);
  const [taskCount, setTaskCount] = useState<TaskListCount>({
    open: 0,
    closed: 0,
  });

  const [localStorageContent, setLocalStorageContent] = useLocalStorage<string>(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "");
  const [placeholder, _] = useState<string>(getRandomQuote());
  const { isTocVisible, focusOnSection } = useToc({ editorRef });
  const [editorContent, setEditorContent] = useState<string>(
    typeof localStorageContent === "string" ? localStorageContent : "",
  );

  const { theme } = useTheme();
  const { paperMode, cycleMode: cyclePaperMode } = usePaperMode();
  const { editorWidth, isWideMode, toggleWidth } = useEditorWidth();
  const isDarkMode = theme === "dark";
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const { shouldShowAlert, dismissAlert } = useTabDetection();

  // Define debounced functions
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
    const { taskCount } = markdownService.processMarkdown(content);
    setTaskCount(taskCount);
  }, 100);

  // Initialize markdown formatter
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

  const handlePlaceholder = (updatedText: string) => {
    if (placeholder === "" || editorRef.current == null) return;

    if (placeholderRef.current == null) {
      placeholderRef.current = new PlaceholderWidget(editorRef.current, placeholder);
    }

    if (updatedText.length > 0) {
      editorRef.current.removeContentWidget(placeholderRef.current);
    } else {
      editorRef.current.addContentWidget(placeholderRef.current);
    }
  };

  // Handle editor mounting
  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor"),
  ) => {
    // Set editor reference
    editorRef.current = editor;

    // Define editor themes
    monaco.editor.defineTheme(EPHE_LIGHT_THEME.name, EPHE_LIGHT_THEME.theme);
    monaco.editor.defineTheme(EPHE_DARK_THEME.name, EPHE_DARK_THEME.theme);
    monaco.editor.setTheme(isDarkMode ? EPHE_DARK_THEME.name : EPHE_LIGHT_THEME.name);

    const markdownExtension = new MonacoMarkdownExtension();
    markdownExtension.activate(editor);

    const content = editor.getValue();
    if (content) {
      const { taskCount } = markdownService.processMarkdown(content);
      setCharCount(content.length);
      setTaskCount(taskCount);
    }

    // Add decorations for checked tasks
    const updateDecorations = (model: monaco.editor.ITextModel | null) => {
      if (!model) return;
      try {
        const oldDecorations = model.getAllDecorations() || [];
        const decorations: monaco.editor.IModelDeltaDecoration[] = [];

        const content = model.getValue();
        const ast = markdownService.getAst(content);

        // Get all tasks with line numbers from markdown service
        const tasks = markdownService.findCheckedTasksWithLineNumbers(ast);

        // Create decorations for checked tasks
        for (const task of tasks) {
          if (task.checked) {
            // Get the line content to determine the full line range for decoration
            const lineContent = model.getLineContent(task.line);

            decorations.push({
              range: new monaco.Range(
                task.line,
                1, // Start from beginning of line
                task.line,
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

        const oldIds = oldDecorations
          .filter((d) => d.options.inlineClassName === "task-completed-line")
          .map((d) => d.id);

        editor.deltaDecorations(oldIds, decorations);

        // Add call to applyTaskCheckboxDecorations to handle checkbox hover styles
        applyTaskCheckboxDecorations(editor, model);
      } catch (error) {
        console.error("Error updating decorations:", error);
      }
    };

    // Add event handlers
    editor.onKeyDown((event) => handleKeyDown(event, editor, editor.getModel(), editor.getPosition()));
    editor.onMouseDown((event) => handleTaskCheckboxToggle(event, editor, editor.getModel()));

    // Update decorations initially and on content change
    const model = editor.getModel();
    if (model) {
      updateDecorations(model);
    }

    handlePlaceholder(editor.getValue());

    const commandSave = async () => {
      let value = editor.getValue();

      if (formatterRef.current) {
        try {
          // Save current cursor position and selection before formatting
          const selection = editor.getSelection();
          const scrollTop = editor.getScrollTop();

          const formatted = await formatterRef.current.formatMarkdown(value);
          if (formatted !== value) {
            editor.setValue(formatted);
            value = formatted;

            // Restore cursor position and selection after formatting
            if (selection) {
              editor.setSelection(selection);
              editor.setScrollTop(scrollTop);
            }
          }
        } catch (error) {
          showToast("Failed to format content", "error");
        }
      }

      saveSnapshot({
        content: value,
        charCount: value.length,
        title: "Manual Save",
        description: "",
      });
      setLocalStorageContent(value);
      showToast("Content formatted and saved", "success");
    };

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      await commandSave();
    });

    // Add key binding for Cmd+K / Ctrl+K to open the command menu
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      setCommandMenuOpen((prev) => !prev);
    });

    // Add key binding for Cmd+Shift+S / Ctrl+Shift+S to open custom snapshot dialog
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
      setSnapshotDialogOpen(true);
    });

    // Add key binding for Cmd+Shift+W / Ctrl+Shift+W to toggle editor width
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyW, () => {
      toggleWidth();
      showToast(`Editor width mode: ${editorWidth === "normal" ? "Wide" : "Normal"}`, "default");
    });

    // Setup content change handler
    editor.onDidChangeModelContent(() => {
      const updatedText = editor.getValue();

      updateDecorations(model);
      setEditorContent(updatedText);
      debouncedSetContent(updatedText);
      debouncedCharCountUpdate(updatedText);
      debouncedTaskCountUpdate(updatedText);
      handlePlaceholder(updatedText);
    });
  };

  const handleCloseCommandMenu = useCallback(() => {
    setCommandMenuOpen(false);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents:
    <div className="h-screen w-screen flex flex-col" onClick={handlePageClick}>
      <div className="flex-1 pt-16 pb-8 overflow-hidden">
        <div className="flex justify-center h-full">
          <div className={`w-full ${isWideMode ? "max-w-6xl" : "max-w-2xl"} px-4 sm:px-6 md:px-2 relative`}>
            <Editor
              height="100%"
              width="100%"
              defaultLanguage="markdown"
              defaultValue={localStorageContent}
              options={editorOptions}
              onMount={handleEditorDidMount}
              className="overflow-visible"
              loading={<Loading className="h-screen w-screen flex items-center justify-center" />}
              theme={isDarkMode ? EPHE_DARK_THEME.name : EPHE_LIGHT_THEME.name}
            />
          </div>
        </div>

        {editorContent.trim() && (
          <div className={`toc-wrapper ${isTocVisible ? "visible" : "hidden"}`}>
            <TableOfContents isVisible={isTocVisible} content={editorContent} onItemClick={focusOnSection} />
          </div>
        )}

        <Footer charCount={charCount} taskCount={taskCount} editorWidth={editorWidth} />

        <CommandMenu
          open={commandMenuOpen}
          onClose={handleCloseCommandMenu}
          editorContent={editorContent}
          editorRef={editorRef}
          markdownFormatterRef={formatterRef}
          paperMode={paperMode}
          cyclePaperMode={cyclePaperMode}
          editorWidth={editorWidth}
          toggleEditorWidth={toggleWidth}
        />

        {snapshotDialogOpen && (
          <Suspense fallback={<Loading className="h-screen w-screen flex items-center justify-center" />}>
            <SnapshotDialog
              isOpen={snapshotDialogOpen}
              onClose={() => setSnapshotDialogOpen(false)}
              editorContent={editorContent}
            />
          </Suspense>
        )}

        <AlreadyOpenDialog shouldShowAlert={shouldShowAlert} onContinue={dismissAlert} />
      </div>
    </div>
  );
};
