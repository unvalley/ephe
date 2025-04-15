import { useEffect, useRef } from "react";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";

type CodeMirrorEditorProps = {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  width?: string;
  className?: string;
  isDarkMode?: boolean;
};

export const CodeMirrorEditor = ({
  value,
  onChange,
  height = "100%",
  width = "100%",
  className = "",
  isDarkMode = false,
}: CodeMirrorEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Basic CodeMirror extensions
    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        "&": {
          height,
          width,
        },
        ".cm-content": {
          fontFamily: "'Menlo', monospace",
          fontSize: "14px",
        },
        ".cm-gutters": {
          backgroundColor: isDarkMode ? "#282c34" : "#f5f5f5",
          color: isDarkMode ? "#ddd" : "#333",
          border: "none",
        },
      }),
    ];

    // Add dark theme if needed
    if (isDarkMode) {
      extensions.push(oneDark);
    }

    // Create the editor state
    const state = EditorState.create({
      doc: value,
      extensions,
    });

    // Create the editor view
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [value, onChange, height, width, isDarkMode]);

  // Update the editor when the value changes from outside
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      const currentCursor = view.state.selection.main;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
        selection: { anchor: Math.min(currentCursor.anchor, value.length) },
      });
    }
  }, [value]);

  return <div ref={editorRef} className={className} />;
};
