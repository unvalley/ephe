import { useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";

export type CodeMirrorEditorRef = {
  focus: () => void;
};

type CodeMirrorEditorProps = {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  width?: string;
  className?: string;
  isDarkMode?: boolean;
  autoFocus?: boolean;
};

export const CodeMirrorEditor = forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>((props, ref) => {
  const {
    value,
    onChange,
    height = "100%",
    width = "100%",
    className = "",
    isDarkMode = false,
    autoFocus = false,
  } = props;

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Expose focus method
  useImperativeHandle(
    ref,
    () => ({
      focus: () => viewRef.current?.focus(),
    }),
    [],
  );

  // Define extensions with proper dependency tracking
  const extensions = useMemo(
    () => [
      lineNumbers(),
      keymap.of(defaultKeymap),
      markdown(),
      ...(isDarkMode ? [oneDark] : []),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.theme({
        "&": { height, width },
        ".cm-content": {
          fontFamily: "'Menlo', monospace",
          fontSize: "14px",
        },
      }),
    ],
    [height, width, isDarkMode, onChange],
  );

  // Create editor on mount and recreate when extensions change
  useEffect(() => {
    if (!editorRef.current) return;

    // Destroy previous instance if it exists
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    // Create editor with essential extensions only
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions,
      }),
      parent: editorRef.current,
    });

    viewRef.current = view;

    if (autoFocus) {
      // Small delay to ensure DOM is ready
      setTimeout(() => view.focus(), 10);
    }

    // Cleanup
    return () => {
      view.destroy();
    };
  }, [extensions, value, autoFocus]);

  // Handle external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (value !== currentContent) {
      // Remember cursor position and scroll
      const selection = view.state.selection;
      const scrollTop = view.scrollDOM.scrollTop;

      // Update content
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
        selection,
      });

      // Restore scroll
      view.scrollDOM.scrollTop = scrollTop;
    }
  }, [value]);

  return <div ref={editorRef} className={className} style={{ height, width }} />;
});
