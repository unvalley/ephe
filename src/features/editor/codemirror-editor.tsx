"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { useTheme } from "../../utils/hooks/use-theme";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { languages } from "@codemirror/language-data";
import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { useAtom } from "jotai";
import { ref } from "process";

const epheColors = {
  light: {
    background: "#00000000", // 透明に近いが、わずかに色を付ける
    foreground: "#090909",
    comment: "#999999",
    keyword: "#FF3C00",
    string: "#0066BB",
    number: "#FF6E40",
    type: "#090909",
    function: "#666666",
    variable: "#444444",
    constant: "#CC2F00",
    operator: "#FF3C00",
    heading: "#FF6E40",
    emphasis: "#D95E00"
  },
  dark: {
    background: "#00000000",
    foreground: "#FFFFFF",
    comment: "#777777",
    keyword: "#FF8A65",
    string: "#88DDFF",
    number: "#FF8A65",
    type: "#EEEEEE",
    function: "#AAAAAA",
    variable: "#DDDDDD",
    constant: "#FF7043",
    operator: "#FF7043",
    heading: "#FF7043",
    emphasis: "#FFAA00"
  },
} as const;

const editorAtom = atomWithStorage<string>(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "");

export const CodeMirrorEditor = () => {
  const [content, setContent] = useAtom(editorAtom);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { isDarkMode } = useTheme();

  // Setup
  useEffect(() => {
    if (!editorRef.current) return; 
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const COLORS = isDarkMode ? epheColors.dark : epheColors.light;

    const epheHighlightStyle = HighlightStyle.define([
      { tag: tags.comment, color: COLORS.comment, fontStyle: "italic" },
      { tag: tags.keyword, color: COLORS.keyword, fontWeight: "bold" },
      { tag: tags.string, color: COLORS.string },
      { tag: tags.number, color: COLORS.number },
      { tag: tags.typeName, color: COLORS.type, fontWeight: "bold" },
      { tag: tags.function(tags.variableName), color: COLORS.function },
      { tag: tags.definition(tags.variableName), color: COLORS.variable },
      { tag: tags.variableName, color: COLORS.variable },
      { tag: tags.constant(tags.variableName), color: COLORS.constant, fontWeight: "bold" },
      { tag: tags.operator, color: COLORS.operator },
      
      // Markdown Style
      { tag: tags.heading, color: COLORS.heading, fontWeight: "bold" },
      { tag: tags.heading1, color: COLORS.heading, fontWeight: "bold", fontSize: "1.4em" }, // prevent size changing between `#` and `##`
      { tag: tags.heading2, color: COLORS.heading, fontWeight: "bold", fontSize: "1.4em" },
      { tag: tags.heading3, color: COLORS.heading, fontWeight: "bold", fontSize: "1.2em" },
      { tag: tags.emphasis, color: COLORS.emphasis, fontStyle: "italic" },
      { tag: tags.strong, color: COLORS.emphasis, fontWeight: "bold" },
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
            padding: "10px 20px",
            lineHeight: "1.6",
            maxWidth: "680px",
            margin: "0 auto",
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
            fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
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
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        // minimal extensions
        extensions: [
          history(),
          keymap.of(defaultKeymap),
          markdown({
            base: markdownLanguage,
            codeLanguages: languages,
            addKeymap: true,
          }),
          
          EditorView.lineWrapping,
          syntaxHighlighting(epheHighlightStyle, { fallback: true }),
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              setContent(update.state.doc.toString());
            }
          }),
          EditorView.theme(theme),
        ],
      }),
      parent: editorRef.current
    });

    viewRef.current = view; 
    setTimeout(() => view.focus(), 100);

    return () => {
      view.destroy();
    };
  }, [isDarkMode]);

  return <div ref={editorRef} className="h-full w-full mx-auto" />
} 