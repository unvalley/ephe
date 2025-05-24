import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/**
 * Manages the CodeMirror theme and highlight style based on dark mode and editor width.
 */
export const useEditorTheme = (isDarkMode: boolean, isWideMode: boolean) => {
  const getHighlightStyle = () => {
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
        fontSize: "1.2em",
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
      editorTheme: EditorView.theme(theme),
      editorHighlightStyle: syntaxHighlighting(epheHighlightStyle, { fallback: true }),
    };
  };

  return getHighlightStyle();
};

const EPHE_COLORS = {
  light: {
    background: "#FFFFFF",
    foreground: "#111111",
    comment: "#9E9E9E",
    keyword: "#111111",
    string: "#616161",
    number: "#555555",
    type: "#333333",
    function: "#555555",
    variable: "#666666",
    constant: "#555555",
    operator: "#757575",
    heading: "#000000",
    emphasis: "#000000",
  },
  dark: {
    background: "#121212",
    foreground: "#F5F5F5",
    comment: "#757575",
    keyword: "#F5F5F5",
    string: "#AAAAAA",
    number: "#BDBDBD",
    type: "#E0E0E0",
    function: "#C0C0C0",
    variable: "#D0D0D0",
    constant: "#E0E0E0",
    operator: "#999999",
    heading: "#FFFFFF",
    emphasis: "#FFFFFF",
  },
} as const;
