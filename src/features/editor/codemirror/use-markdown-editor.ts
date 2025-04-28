import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useAtom } from "jotai";
import { useRef, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { showToast } from "../../../utils/components/toast";
import { useEditorWidth } from "../../../utils/hooks/use-editor-width";
import { useTheme } from "../../../utils/hooks/use-theme";
import { DprintMarkdownFormatter } from "../markdown/formatter/dprint-markdown-formatter";
import { getRandomQuote } from "../quotes";
import { taskStorage } from "../tasks/task-storage";
import { EPHE_COLORS } from "./codemirror-theme";
import { createDefaultTaskHandler, createChecklistPlugin } from "./tasklist";
import { taskKeyBindings } from "./tasklist/keymap";
import { registerTaskHandler } from "./tasklist/task-close";
import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";
import { snapshotStorage } from "../../snapshots/snapshot-storage";
import { useTaskAutoFlush } from "../../../utils/hooks/use-task-auto-flush";

const editorAtom = atomWithStorage<string>(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "");

export const useMarkdownEditor = () => {
  const editor = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<HTMLDivElement>();
  const [view, setView] = useState<EditorView>();
  const formatterRef = useRef<DprintMarkdownFormatter | null>(null);
  const { taskAutoFlushMode } = useTaskAutoFlush();

  const [content, setContent] = useAtom(editorAtom);
  const { isDarkMode } = useTheme();
  const { isWideMode } = useEditorWidth();

  const themeCompartment = useRef(new Compartment()).current;
  const highlightCompartment = useRef(new Compartment()).current;

  const taskHandlerRef = useRef<ReturnType<typeof createDefaultTaskHandler> | null>(null);

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

  // Formatter initialization is a side effect, isolated in useEffect
  useEffect(() => {
    let mounted = true;
    const initFormatter = async () => {
      try {
        const formatter = await DprintMarkdownFormatter.getInstance();
        if (mounted) formatterRef.current = formatter;
      } catch (error) {
        console.error("Failed to initialize markdown formatter:", error);
      }
    };
    initFormatter();
    return () => {
      mounted = false;
      formatterRef.current = null;
    };
  }, []);

  const onSave = useCallback(async (view: EditorView) => {
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

      // snapshot
      snapshotStorage.save({
        content: formattedText,
        charCount: formattedText.length,
      });

      showToast("Format and saved snapshot", "default");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      showToast(`Error formatting document: ${message}`, "error");
      return false;
    }
  }, []);

  // Memoize highlight style for performance
  const getHighlightStyle = useCallback((isDarkMode: boolean, isWideMode: boolean) => {
    const COLORS = isDarkMode ? EPHE_COLORS.dark : EPHE_COLORS.light;

    const epheHighlightStyle = HighlightStyle.define([
      { tag: tags.comment, color: COLORS.comment, fontStyle: "italic" },
      { tag: tags.keyword, color: COLORS.keyword },
      { tag: tags.string, color: COLORS.string },
      { tag: tags.number, color: COLORS.number },
      { tag: tags.typeName, color: COLORS.type },
      { tag: tags.function(tags.variableName), color: COLORS.function },
      { tag: tags.definition(tags.variableName), color: COLORS.variable },
      { tag: tags.variableName, color: COLORS.variable },
      {
        tag: tags.constant(tags.variableName),
        color: COLORS.constant,
      },
      { tag: tags.operator, color: COLORS.operator },

      // Markdown Style
      { tag: tags.heading, color: COLORS.heading },
      {
        tag: tags.heading1,
        color: COLORS.heading,
        fontSize: "1.2em", // prevent size changing between `#` and `##`
      },
      {
        tag: tags.heading2,
        color: COLORS.heading,
        fontSize: "1.2em",
      },
      {
        tag: tags.heading3,
        color: COLORS.heading,
        fontSize: "1.1em",
      },
      { tag: tags.emphasis, color: COLORS.emphasis, fontStyle: "italic" },
      { tag: tags.strong, color: COLORS.emphasis },
      { tag: tags.link, color: COLORS.string, textDecoration: "underline" },
      { tag: tags.url, color: COLORS.string, textDecoration: "underline" },
      { tag: tags.monospace, color: COLORS.constant, fontFamily: "monospace" },
    ]);

    const theme = {
      "&": {
        height: "100%",
        width: "100%",
        background: COLORS.background,
        color: COLORS.foreground,
      },
      ".cm-content": {
        fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
        fontSize: "16px",
        padding: "60px 20px",
        lineHeight: "1.6",
        maxWidth: isWideMode ? "100%" : "680px",
        margin: "0 auto",
        caretColor: COLORS.foreground,
      },
      ".cm-cursor": {
        borderLeftColor: COLORS.foreground,
        borderLeftWidth: "2px",
      },
      "&.cm-editor": {
        outline: "none",
        border: "none",
        background: "transparent",
      },
      "&.cm-focused": {
        outline: "none",
      },
      ".cm-scroller": {
        fontFamily: "monospace",
        background: "transparent",
      },
      ".cm-gutters": {
        background: "transparent",
        border: "none",
      },
      ".cm-activeLineGutter": {
        background: "transparent",
      },
      ".cm-line": {
        padding: "0 4px 0 0",
      },
    };

    return {
      epheHighlightStyle,
      theme,
    };
  }, []);

  useEffect(() => {
    if (editor.current) setContainer(editor.current);
  }, []);

  // Register the task handler for global access
  useEffect(() => {
    // Register the handler only when it's created
    if (taskHandlerRef.current) {
      registerTaskHandler(taskHandlerRef.current);
    }
    return () => {
      registerTaskHandler(undefined); // Clean up on unmount or when handler changes
    };
  }, []); // Run only once on mount and cleanup on unmount

  useLayoutEffect(() => {
    // Change task handler when autoFlushMode is changed
    taskHandlerRef.current = createDefaultTaskHandler(taskStorage, taskAutoFlushMode);
    registerTaskHandler(taskHandlerRef.current);

    if (!view && container) {
      const { epheHighlightStyle, theme } = getHighlightStyle(isDarkMode, isWideMode);
      const state = EditorState.create({
        doc: content,
        extensions: [
          keymap.of(defaultKeymap),
          history(),
          keymap.of(historyKeymap),

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

          themeCompartment.of(EditorView.theme(theme)),
          highlightCompartment.of(syntaxHighlighting(epheHighlightStyle, { fallback: true })),
          placeholder(getRandomQuote()),

          keymap.of([
            {
              key: "Mod-s",
              run: (targetView) => {
                onSave(targetView);
                return true;
              },
              preventDefault: true,
            },
            ...taskKeyBindings,
          ]),
          Prec.high(createChecklistPlugin(taskHandlerRef.current)),
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
    isDarkMode,
    isWideMode,
    setContent,
    getHighlightStyle,
    onSave,
    highlightCompartment.of,
    themeCompartment.of,
    taskAutoFlushMode,
  ]);

  // Update theme when dark mode changes
  useEffect(() => {
    if (view) {
      const { epheHighlightStyle, theme } = getHighlightStyle(isDarkMode, isWideMode);
      view.dispatch({
        effects: [
          themeCompartment.reconfigure(EditorView.theme(theme)),
          highlightCompartment.reconfigure(syntaxHighlighting(epheHighlightStyle, { fallback: true })),
        ],
      });
    }
  }, [isDarkMode, isWideMode, view, getHighlightStyle, highlightCompartment.reconfigure, themeCompartment.reconfigure]);

  return {
    editor,
    view,
    onSave: view ? () => onSave(view) : undefined,
  };
};
