import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

// Light theme colors
const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#24292e"
  },
  ".cm-content": {
    caretColor: "#24292e"
  },
  ".cm-cursor": {
    borderLeftColor: "#24292e"
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "#d7d4f0"
  },
  ".cm-panels": {
    backgroundColor: "#f8f9fa",
    color: "#24292e"
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid #ddd"
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid #ddd"
  },
  ".cm-searchMatch": {
    backgroundColor: "#ffc107",
    outline: "1px solid #0e639c"
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "#ffbb33"
  },
});

// Dark theme colors
const darkTheme = EditorView.theme({
  "&": {
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4"
  },
  ".cm-content": {
    caretColor: "#d4d4d4"
  },
  ".cm-cursor": {
    borderLeftColor: "#d4d4d4"
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "#264f78"
  },
  ".cm-panels": {
    backgroundColor: "#252526",
    color: "#d4d4d4"
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid #484848"
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid #484848"
  },
  ".cm-searchMatch": {
    backgroundColor: "#ffc107",
    outline: "1px solid #0e639c"
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "#ffbb33"
  },
});

// Common syntax highlighting for both themes
const syntaxHighlightingStyle = HighlightStyle.define([
  {tag: t.heading, fontWeight: "bold"},
  {tag: t.heading1, fontSize: "1.6em", fontWeight: "bold"},
  {tag: t.heading2, fontSize: "1.4em", fontWeight: "bold"},
  {tag: t.heading3, fontSize: "1.2em", fontWeight: "bold"},
  {tag: t.heading4, fontSize: "1.1em", fontWeight: "bold"},
  {tag: t.emphasis, fontStyle: "italic"},
  {tag: t.strong, fontWeight: "bold"},
  {tag: t.link, color: "#0969da"},
  {tag: t.url, color: "#0969da"},
  {tag: t.comment, fontStyle: "italic", color: "#6a737d"},
  {tag: t.monospace, color: "#24292e", backgroundColor: "#f6f8fa"},
]);

export const epheLight: Extension = [
  lightTheme,
  syntaxHighlighting(syntaxHighlightingStyle)
];

export const epheDark: Extension = [
  darkTheme,
  syntaxHighlighting(syntaxHighlightingStyle)
];

export const DEFAULT_EDITOR_OPTIONS = {
  lineWrapping: true,
  lineNumbers: true,
  indentWithTabs: false,
  tabSize: 2,
}; 