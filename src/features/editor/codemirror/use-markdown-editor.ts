import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { useAtom } from "jotai";
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { showToast } from "../../../utils/components/toast";
import { useEditorWidth } from "../../../utils/hooks/use-editor-width";
import { useTheme } from "../../../utils/hooks/use-theme";
import { DprintMarkdownFormatter } from "../markdown/formatter/dprint-markdown-formatter";
import { getRandomQuote } from "../quotes";
import { taskStorage } from "../tasks/task-storage";
import { createDefaultTaskHandler, createChecklistPlugin } from "./tasklist";
import { registerTaskHandler } from "./tasklist/task-close";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";
import { snapshotStorage } from "../../snapshots/snapshot-storage";
import { useEditorTheme } from "./use-editor-theme";
import { useCharCount } from "../../../utils/hooks/use-char-count";
import { useTaskAutoFlush } from "../../../utils/hooks/use-task-auto-flush";
import { useMobileDetector } from "../../../utils/hooks/use-mobile-detector";
import { urlClickPlugin, urlHoverTooltip } from "./url-click";

const storage = createJSONStorage<string>(() => localStorage);

const crossTabStorage = {
  ...storage,
  subscribe: (key: string, callback: (value: string) => void, initialValue: string): (() => void) => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return () => {};
    }
    const handler = (e: StorageEvent) => {
      if (e.storageArea === localStorage && e.key === key) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : initialValue;
          callback(newValue);
        } catch {
          callback(initialValue);
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};

const editorAtom = atomWithStorage<string>(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "", crossTabStorage);

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
  const editor = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<HTMLDivElement>();
  const [view, setView] = useState<EditorView>();
  const [content, setContent] = useAtom(editorAtom);

  const formatterRef = useMarkdownFormatter();
  const taskHandlerRef = useTaskHandler();

  const { isDarkMode } = useTheme();
  const { isWideMode } = useEditorWidth();
  const { editorTheme, editorHighlightStyle } = useEditorTheme(isDarkMode, isWideMode);
  const { setCharCount } = useCharCount();
  const { isMobile } = useMobileDetector();

  const themeCompartment = useRef(new Compartment()).current;
  const highlightCompartment = useRef(new Compartment()).current;

  // Listen for content restore events
  useEffect(() => {
    const handleContentRestored = (event: CustomEvent<{ content: string }>) => {
      if (view && event.detail.content) {
        // Update the editor content
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: event.detail.content },
        });
        // Also update the atom value to keep them in sync
        setContent(event.detail.content);
      }
    };
    // Add event listener with type assertion
    window.addEventListener("ephe:content-restored", handleContentRestored as EventListener);
    return () => {
      // Remove event listener on cleanup
      window.removeEventListener("ephe:content-restored", handleContentRestored as EventListener);
    };
  }, [view, setContent]);

  // Listen for external content updates
  // - text edit emits storage event
  // - subscribe updates the editor content
  useEffect(() => {
    if (view && content !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    }
    setCharCount(content.length);
  }, [view, content]);

  const onFormat = async (view: EditorView) => {
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

  const onSaveSnapshot = async (view: EditorView) => {
    try {
      const currentText = view.state.doc.toString();

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

  useEffect(() => {
    if (editor.current) setContainer(editor.current);
  }, []);

  useLayoutEffect(() => {
    if (!view && container) {
      const state = EditorState.create({
        doc: content,
        extensions: [
          keymap.of(defaultKeymap),
          history(),
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
              const updatedContent = update.state.doc.toString();
              window.requestAnimationFrame(() => {
                setContent(updatedContent);
              });
            }
          }),

          themeCompartment.of(editorTheme),
          highlightCompartment.of(editorHighlightStyle),
          // Only show placeholder on non-mobile devices
          ...(isMobile ? [] : [placeholder(getRandomQuote())]),

          keymap.of([
            {
              key: "Mod-s",
              run: (targetView) => {
                onFormat(targetView);
                return true;
              },
              preventDefault: true,
            },
            {
              key: "Mod-Shift-s",
              run: (targetView) => {
                onSaveSnapshot(targetView);
                return true;
              },
              preventDefault: true,
            },
          ]),
          urlClickPlugin,
          urlHoverTooltip,
        ],
      });
      const viewCurrent = new EditorView({ state, parent: container });
      setView(viewCurrent);
      viewCurrent.focus(); // store focus
    }
  }, [
    view,
    container,
    content,
    setContent,
    onFormat,
    onSaveSnapshot,
    highlightCompartment.of,
    themeCompartment.of,
    editorTheme,
    editorHighlightStyle,
    isMobile,
  ]);

  // Update theme when dark mode changes
  useEffect(() => {
    if (view) {
      view.dispatch({
        effects: [themeCompartment.reconfigure(editorTheme), highlightCompartment.reconfigure(editorHighlightStyle)],
      });
    }
  }, [view, highlightCompartment.reconfigure, themeCompartment.reconfigure, editorTheme, editorHighlightStyle]);

  return {
    editor,
    view,
    onFormat: view ? () => onFormat(view) : undefined,
    onSaveSnapshot: view ? () => onSaveSnapshot(view) : undefined,
  };
};
