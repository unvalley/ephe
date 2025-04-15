"use client";

import * as monaco from "monaco-editor";
import { useState, useEffect, useRef, Suspense } from "react";
import { useTheme } from "../../../utils/hooks/use-theme";
import { useDebouncedCallback } from "use-debounce";
import { useTabDetection } from "../use-tab-detection";
import { usePaperMode } from "../../../utils/hooks/use-paper-mode";
import { useEditorWidth } from "../../../utils/hooks/use-editor-width";
// import { CommandMenu } from "../../command/command-k";
import { getRandomQuote } from "../quotes";
import {
  handleKeyDown,
  applyTaskCheckboxDecorations,
  editorOptions,
  EPHE_DARK_THEME,
  EPHE_LIGHT_THEME,
} from "./editor-utils";
import { handleTaskCheckboxToggle } from "./editor-utils";
import { DprintMarkdownFormatter } from "../markdown/formatter/dprint-markdown-formatter";
import type { MarkdownFormatter } from "../markdown/formatter/markdown-formatter";
import { MonacoMarkdownExtension } from "./monaco-markdown";
import { markdownService } from "../markdown/ast/markdown-service";
import { PlaceholderWidget } from "./placeholder-widget";
import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";
import { saveSnapshot } from "../../snapshots/snapshot-storage";
// import { TableOfContents } from "../table-of-contents";
import { showToast } from "../../../utils/components/toast";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { usePreviewMode } from "../../../utils/hooks/use-preview-mode";
import { useToc } from "../../../utils/hooks/use-toc";
import { useCharCount } from "../../../utils/hooks/use-char-count";
import { Loading } from "../../../utils/components/loading";

// Initialize remark processor with GFM plugin
const remarkProcessor = remark()
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

const editorAtom = atomWithStorage<string>(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "");

export const EditorApp = () => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const formatterRef = useRef<MarkdownFormatter | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { setCharCount } = useCharCount();
  const [placeholder, _] = useState<string>(getRandomQuote());
  const { isVisibleToc, focusOnSection } = useToc({ editorRef });
  const [editorContent, setEditorContent] = useAtom(editorAtom);
  const [renderedHTML, setRenderedHTML] = useState<string>("");

  const { isDarkMode } = useTheme();
  const { paperMode, cycleMode: cyclePaperMode } = usePaperMode();
  const { previewMode, togglePreviewMode } = usePreviewMode();
  const { editorWidth, isWideMode, toggleEditorWidth } = useEditorWidth();

  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const { shouldShowAlert, dismissAlert } = useTabDetection();

  // Render markdown when content changes
  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        const result = await remarkProcessor.process(editorContent);
        setRenderedHTML(String(result));
      } catch (error) {
        console.error("Error rendering markdown:", error);
        setRenderedHTML(`<p>Error rendering markdown: ${error instanceof Error ? error.message : String(error)}</p>`);
      }
    };

    renderMarkdown();
  }, [editorContent]);

  // Define debounced functions
  const debouncedSetContent = useDebouncedCallback((content: string) => {
    setEditorContent(content);
  }, 300);

  const debouncedCharCountUpdate = useDebouncedCallback(
    (content: string) => {
      setCharCount(content.length);
    },
    50, // Faster updates for character count
  );

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
    if (!previewMode && editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handlePlaceholder = (updatedText: string) => {
    if (placeholder === "" || !editorRef.current) return;
    if (placeholderRef.current == null) {
      placeholderRef.current = new PlaceholderWidget(editorRef.current, placeholder);
    }
    if (updatedText.length > 0) {
      editorRef.current.removeContentWidget(placeholderRef.current);
    } else {
      editorRef.current.addContentWidget(placeholderRef.current);
    }
  };

  // Setup editor decorations for tasks
  const setupEditorDecorations = (editor: monaco.editor.IStandaloneCodeEditor) => {
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

    // Setup content change handler
    editor.onDidChangeModelContent(() => {
      const updatedText = editor.getValue();
      const model = editor.getModel();

      // Update decorations first (this doesn't affect cursor position)
      updateDecorations(model);

      // Store cursor position and scroll state BEFORE any state updates
      const selection = editor.getSelection();
      const scrollPosition = editor.getScrollTop();

      // Defer state updates to prevent UI flickering
      window.requestAnimationFrame(() => {
        // Update application state
        setEditorContent(updatedText);
        debouncedSetContent(updatedText);
        debouncedCharCountUpdate(updatedText);

        // IMPORTANT: Restore cursor position and scroll state AFTER state updates
        if (selection && editor) {
          editor.setSelection(selection);
          editor.setScrollTop(scrollPosition);
        }
      });

      handlePlaceholder(updatedText);
    });

    // Update decorations initially
    const model = editor.getModel();
    if (model) {
      updateDecorations(model);
    }
  };

  // Setup editor commands
  const setupEditorCommands = (editor: monaco.editor.IStandaloneCodeEditor) => {
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
      setEditorContent(value);
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
      toggleEditorWidth();
      showToast(`Editor width mode: ${editorWidth === "normal" ? "Wide" : "Normal"}`, "default");
    });

    // Add key binding for Cmd+P / Ctrl+P to toggle preview mode
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      togglePreviewMode();
      showToast(`Preview mode: ${!previewMode ? "On" : "Off"}`, "default");
    });
  };

  // Initialize Monaco Editor
  useEffect(() => {
    // setIsLoading(true);

    // Define theme
    monaco.editor.defineTheme(EPHE_LIGHT_THEME.name, EPHE_LIGHT_THEME.theme);
    monaco.editor.defineTheme(EPHE_DARK_THEME.name, EPHE_DARK_THEME.theme);

    // Set active theme
    const themeName = isDarkMode ? EPHE_DARK_THEME.name : EPHE_LIGHT_THEME.name;
    monaco.editor.setTheme(themeName);

    // Create model if it doesn't exist
    let model = monaco.editor.getModels().find((m) => m.uri.path === "/ephe.md");

    if (!model) {
      model = monaco.editor.createModel(editorContent, "markdown", monaco.Uri.parse("file:///ephe.md"));
    }

    if (editorContainerRef.current) {
      editorRef.current = monaco.editor.create(editorContainerRef.current, {
        ...editorOptions,
      });
    }

    setIsLoading(false);

    return () => {
      // cleanup
      if (editorRef.current) {
        // editorRef.current.dispose();
        editorRef.current = null;
      }
    };

    // // Set up extensions and event handlers
    // const markdownExtension = new MonacoMarkdownExtension();
    // markdownExtension.activate(monaco.editor);

    // // Event handlers
    // monaco.editor.onKeyDown((event) => handleKeyDown(event, monaco.editor, monaco.editor.getModel(), monaco.editor.getPosition()));
    // monaco.editor.onMouseDown((event) => handleTaskCheckboxToggle(event, monaco.editor, monaco.editor.getModel()));

    // setupEditorDecorations(monaco.editor);
    // setupEditorCommands(monaco.editor);

    // // Initialize placeholders
    // handlePlaceholder(monaco.editor.getValue());

    // setCharCount(monaco.editor.getValue().length);
    // setIsEditorReady(true);

    // // Update editor layout on window resize
    // const handleResize = () => {
    //   if (editorRef.current) {
    //     editorRef.current.layout();
    //   }
    // };

    // window.addEventListener('resize', handleResize);

    // // Cleanup on unmount
    // return () => {
    //   window.removeEventListener('resize', handleResize);
    //   if (editorRef.current) {
    //     editorRef.current.dispose();
    //     editorRef.current = null;
    //   }
    // };
  }, [editorContent, isDarkMode, previewMode, debouncedCharCountUpdate, debouncedSetContent]);

  // Update editor theme when theme changes
  useEffect(() => {
    if (editorRef.current) {
      const themeName = isDarkMode ? EPHE_DARK_THEME.name : EPHE_LIGHT_THEME.name;
      monaco.editor.setTheme(themeName);
    }
  }, [isDarkMode]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open command menu
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandMenuOpen((prev) => !prev);
      }

      // Cmd/Ctrl + Shift + S to open snapshot dialog
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "s") {
        e.preventDefault();
        setSnapshotDialogOpen(true);
      }

      // Cmd/Ctrl + Shift + W to toggle editor width
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "w") {
        e.preventDefault();
        toggleEditorWidth();
        showToast(`Editor width mode: ${editorWidth === "normal" ? "Wide" : "Normal"}`, "default");
      }

      // Cmd/Ctrl + P to toggle preview mode
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "p") {
        e.preventDefault();
        togglePreviewMode();
        showToast(`Preview mode: ${!previewMode ? "On" : "Off"}`, "default");
      }

      // Cmd/Ctrl + S to save content
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        if (formatterRef.current) {
          formatterRef.current
            .formatMarkdown(editorContent)
            .then((formatted) => {
              if (formatted !== editorContent) {
                setEditorContent(formatted);
              }

              saveSnapshot({
                content: formatted,
                charCount: formatted.length,
                title: "Manual Save",
                description: "",
              });
              showToast("Content formatted and saved", "success");
            })
            .catch(() => {
              showToast("Failed to format content", "error");
            });
        } else {
          saveSnapshot({
            content: editorContent,
            charCount: editorContent.length,
            title: "Manual Save",
            description: "",
          });
          showToast("Content saved", "success");
        }
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcuts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally not including all dependencies to prevent unnecessary re-creation of event handlers
  }, [toggleEditorWidth, togglePreviewMode, editorWidth, previewMode]);

  return (
    // // biome-ignore lint/a11y/useKeyWithClickEvents:
    // <div className="flex h-screen w-screen flex-col" onClick={handlePageClick}>
    //   <div className="flex-1 overflow-hidden pt-16 pb-8">
    //     <div className="flex h-full justify-center">
    <div className="h-full w-full">
      {isLoading && <Loading className="flex h-full w-full items-center justify-center" />}
      <div ref={editorContainerRef} className="" style={{ visibility: isLoading ? "hidden" : "visible" }} />
    </div>
    //         ) : (
    //           <div className="prose prose-slate dark:prose-invert h-full max-w-[680px] mx-auto overflow-auto px-2 py-2">
    //             <div
    //               ref={previewRef}
    //               // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
    //               dangerouslySetInnerHTML={{ __html: renderedHTML }}
    //               className="markdown-preview min-h-full overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    //             />
    //           </div>
    //         )}
    //       </div>
    //     </div>

    //     {!previewMode && editorContent.trim().length > 0 && (
    //       <div className={`toc-wrapper ${isVisibleToc ? "visible" : "hidden"}`}>
    //         <TableOfContents isVisible={isVisibleToc} content={editorContent} onItemClick={focusOnSection} />
    //       </div>
    //     )}

    //     <Footer
    //       previewMode={previewMode}
    //       togglePreview={togglePreviewMode}
    //     />

    //     {/* <CommandMenu
    //       open={commandMenuOpen}
    //       onClose={() => setCommandMenuOpen(false)}
    //       editorContent={editorContent}
    //       editorRef={editorRef}
    //       markdownFormatterRef={formatterRef}
    //       paperMode={paperMode}
    //       cyclePaperMode={cyclePaperMode}
    //       editorWidth={editorWidth}
    //       toggleEditorWidth={toggleEditorWidth}
    //       previewMode={previewMode}
    //       togglePreviewMode={togglePreviewMode}
    //     /> */}

    //     {snapshotDialogOpen && (
    //       <Suspense fallback={<Loading className="flex h-screen w-screen items-center justify-center" />}>
    //         <SnapshotDialog
    //           isOpen={snapshotDialogOpen}
    //           onClose={() => setSnapshotDialogOpen(false)}
    //           editorContent={editorContent}
    //         />
    //       </Suspense>
    //     )}

    //     <AlreadyOpenDialog shouldShowAlert={shouldShowAlert} onContinue={dismissAlert} />
    //   </div>
    // </div>
  );
};
