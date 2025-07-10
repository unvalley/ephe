import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { useAtom } from "jotai";
import { useRef, useEffect, useLayoutEffect } from "react";
import { showToast } from "../../../utils/components/toast";
import { useEditorWidth } from "../../../utils/hooks/use-editor-width";
import { useTheme } from "../../../utils/hooks/use-theme";
import { useFontFamily } from "../../../utils/hooks/use-font";
import { DprintMarkdownFormatter } from "../markdown/formatter/dprint-markdown-formatter";
import { getRandomQuote } from "../quotes";
import { taskStorage } from "../tasks/task-storage";
import { createDefaultTaskHandler, createChecklistPlugin } from "./tasklist";
import { registerTaskHandler } from "./tasklist/task-close";
import { snapshotStorage } from "../../snapshots/snapshot-storage";
import { useEditorTheme } from "./use-editor-theme";
import { useCharCount } from "../../../utils/hooks/use-char-count";
import { useTaskAutoFlush } from "../../../utils/hooks/use-task-auto-flush";
import { useMobileDetector } from "../../../utils/hooks/use-mobile-detector";
import { urlClickPlugin, urlHoverTooltip } from "./url-click";
import { useCursorPosition } from "./use-cursor-position";
import { useDebouncedCallback } from "use-debounce";
import { editorContentAtom } from "../../../utils/atoms/editor";

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

const useTaskHandler = () => {
  const { taskAutoFlushMode } = useTaskAutoFlush();
  const handlerRef = useRef(createDefaultTaskHandler(taskStorage, taskAutoFlushMode));
  useEffect(() => {
    handlerRef.current = createDefaultTaskHandler(taskStorage, taskAutoFlushMode);
    registerTaskHandler(handlerRef.current);
    return () => registerTaskHandler(undefined);
  }, [taskAutoFlushMode]);
  return handlerRef;
};

export const useMarkdownEditor = () => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [content, setContent] = useAtom(editorContentAtom);

  const formatterRef = useMarkdownFormatter();
  const taskHandlerRef = useTaskHandler();

  const { isDarkMode } = useTheme();
  const { isWideMode } = useEditorWidth();
  const { currentFontValue } = useFontFamily();
  const { editorTheme, editorHighlightStyle } = useEditorTheme(isDarkMode, isWideMode, currentFontValue);
  const { setCharCount } = useCharCount();
  const { isMobile } = useMobileDetector();

  const themeCompartment = useRef(new Compartment()).current;
  const highlightCompartment = useRef(new Compartment()).current;

  const debouncedSetContent = useDebouncedCallback((view: EditorView) => {
    const newContent = view.state.doc.toString();
    // Only update if content actually changed to prevent unnecessary updates
    setContent((prevContent) => (prevContent !== newContent ? newContent : prevContent));
  }, 300);

  const onFormat = async () => {
    const view = viewRef.current;
    if (!view) return false;
    if (!formatterRef.current) {
      showToast("Formatter not initialized yet", "error");
      return false;
    }
    try {
      // format
      const { state } = view;
      const scrollTop = view.scrollDOM.scrollTop;
      const cursorPos = state.selection.main.head;
      const cursorLine = state.doc.lineAt(cursorPos);
      const cursorLineNumber = cursorLine.number;
      const cursorColumn = cursorPos - cursorLine.from;
      const currentText = state.doc.toString();
      const formattedText = await formatterRef.current.formatMarkdown(currentText);
      if (formattedText !== currentText) {
        view.dispatch({
          changes: { from: 0, to: state.doc.length, insert: formattedText },
        });
        // Restore cursor position after formatting
        try {
          const newState = view.state;
          const newDocLineCount = newState.doc.lines;
          if (cursorLineNumber <= newDocLineCount) {
            const newLine = newState.doc.line(cursorLineNumber);
            const newColumn = Math.min(cursorColumn, newLine.length);
            const newPos = newLine.from + newColumn;
            view.dispatch({ selection: { anchor: newPos, head: newPos } });
          }
        } catch (selectionError) {
          view.dispatch({ selection: { anchor: 0, head: 0 } });
        }
        view.scrollDOM.scrollTop = Math.min(scrollTop, view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight);
      }

      showToast("Document formatted", "default");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      showToast(`Error formatting document: ${message}`, "error");
      return false;
    }
  };

  const onSaveSnapshot = async () => {
    const view = viewRef.current;
    if (!view) return false;
    try {
      const currentText = view.state.doc.toString();
      if (!currentText) {
        showToast("No content to save", "error");
        return false;
      }

      // snapshot
      snapshotStorage.save({
        content: currentText,
        charCount: currentText.length,
      });

      showToast("Snapshot saved", "default");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      showToast(`Error saving snapshot: ${message}`, "error");
      return false;
    }
  };

  useLayoutEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        keymap.of(defaultKeymap),
        history({ minDepth: 50, newGroupDelay: 250 }),
        keymap.of(historyKeymap),

        // Task key bindings with high priority BEFORE markdown extension
        Prec.high(createChecklistPlugin(taskHandlerRef.current)),

        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
          addKeymap: true,
        }),

        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // Skip updates from programmatic changes (formatting, restore, etc.)
            // Only update for user input
            const isUserInput = update.transactions.some((tr) => tr.isUserEvent("input") || tr.isUserEvent("delete"));
            if (isUserInput) {
              debouncedSetContent(update.view);
              const updatedContent = update.state.doc.toString();
              setCharCount(updatedContent.length);
            }
          }
        }),

        themeCompartment.of(editorTheme),
        highlightCompartment.of(editorHighlightStyle),
        // Only show placeholder on non-mobile devices
        ...(isMobile ? [] : [placeholder(getRandomQuote())]),

        keymap.of([
          {
            key: "Mod-s",
            run: () => {
              void onFormat();
              return true;
            },
            preventDefault: true,
          },
          {
            key: "Mod-Shift-s",
            run: () => {
              void onSaveSnapshot();
              return true;
            },
            preventDefault: true,
          },
        ]),
        urlClickPlugin,
        urlHoverTooltip,
      ],
    });
    viewRef.current = new EditorView({ state, parent: editorRef.current });
    viewRef.current.focus();

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []); // Remove editorRef.current dependency to prevent re-initialization

  const { resetCursorPosition } = useCursorPosition(viewRef.current ?? undefined);

  // Listen for content restore events
  useEffect(() => {
    const view = viewRef.current;
    const handleContentRestored = (event: CustomEvent<{ content: string }>) => {
      if (view && event.detail.content) {
        // Update the editor content
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: event.detail.content },
        });
        // Also update the atom value to keep them in sync
        setContent(event.detail.content);
        // Reset cursor position when content is restored
        resetCursorPosition();
      }
    };
    // Add event listener with type assertion
    window.addEventListener("ephe:content-restored", handleContentRestored as EventListener);
    return () => {
      // Remove event listener on cleanup
      window.removeEventListener("ephe:content-restored", handleContentRestored as EventListener);
    };
  }, [viewRef.current, setContent, resetCursorPosition]);

  // Update theme when dark mode changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [themeCompartment.reconfigure(editorTheme), highlightCompartment.reconfigure(editorHighlightStyle)],
    });
  }, [highlightCompartment.reconfigure, themeCompartment.reconfigure, editorTheme, editorHighlightStyle]);

  // Listen for external content updates
  // - text edit emits storage event
  // - subscribe updates the editor content
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // Get the current document content
    const currentDocContent = view.state.doc.toString();

    // Skip if content is exactly the same as current editor content
    // This prevents cyclic updates when our own changes come back through the state
    if (content === currentDocContent) {
      setCharCount(content.length);
      return;
    }

    // Update the editor with the new content while preserving cursor position
    const currentSelection = view.state.selection.main;
    const currentAnchor = currentSelection.anchor;
    const currentHead = currentSelection.head;

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
      selection: {
        anchor: Math.min(currentAnchor, content.length),
        head: Math.min(currentHead, content.length),
      },
    });

    setCharCount(content.length);
  }, [content, setCharCount]);

  return {
    editor: editorRef,
    view: viewRef,
    onFormat: viewRef.current ? () => onFormat() : undefined,
    onSaveSnapshot: viewRef.current ? () => onSaveSnapshot() : undefined,
  };
};
