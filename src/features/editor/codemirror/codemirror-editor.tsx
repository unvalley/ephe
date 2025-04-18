"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { EditorState, Prec, Compartment } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { useTheme } from "../../../utils/hooks/use-theme";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { languages } from "@codemirror/language-data";
import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";
import { useAtom } from "jotai";
import { DprintMarkdownFormatter } from "../markdown/formatter/dprint-markdown-formatter";
import { showToast } from "../../../utils/components/toast";
import { EPHE_COLORS } from "./codemirror-theme";
import { createChecklistPlugin, createDefaultTaskHandler } from "./tasklist";
import { taskKeyBindings } from "./tasklist/keymap";
import { getRandomQuote } from "../quotes";
import { useEditorWidth } from "../../../utils/hooks/use-editor-width";
import { taskStorage } from "../tasks/task-storage";

const editorAtom = atomWithStorage<string>(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "");

export const useMarkdownEditor = () => {
  const editor = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<HTMLDivElement>();
  const [view, setView] = useState<EditorView>();
  const formatterRef = useRef<DprintMarkdownFormatter | null>(null);

  const [content, setContent] = useAtom(editorAtom);
  const { isDarkMode } = useTheme();
  const { isWideMode } = useEditorWidth();

  const themeCompartment = useRef(new Compartment()).current;
  const highlightCompartment = useRef(new Compartment()).current;

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

  // Format document is pure except for toast/dispatch (side effects isolated)
  const formatDocument = useCallback(async (view: EditorView) => {
    if (!formatterRef.current) {
      showToast("Formatter not initialized yet", "error");
      return false;
    }
    try {
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
      showToast("Document formatted successfully", "default");
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

  const taskHandler = useMemo(() => createDefaultTaskHandler(taskStorage), []);

  useLayoutEffect(() => {
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
              run: (view) => {
                formatDocument(view);
                return true;
              },
              preventDefault: true,
            },
            ...taskKeyBindings,
          ]),
          Prec.high(createChecklistPlugin(taskHandler)),
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
    formatDocument,
    highlightCompartment.of,
    taskHandler,
    themeCompartment.of,
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
    formatDocument: view ? () => formatDocument(view) : undefined,
  };
};

export const CodeMirrorEditor = () => {
  const { editor } = useMarkdownEditor();

  return <div data-testid="code-mirror-editor" ref={editor} className="mx-auto h-full w-full" />;
};
