import { useState, useRef, useEffect, useMemo } from "react";
import { useTheme } from "../../utils/hooks/use-theme";
import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/components/toast";
import { Loading } from "../../utils/components/loading";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { EPHE_COLORS } from "../editor/codemirror/codemirror-theme";
import { type Snapshot, snapshotStorage } from "./snapshot-storage";

type SnapshotViewerProps = {
  isOpen: boolean;
  onClose: () => void;
  snapshot: Snapshot | null;
};

export const SnapshotViewer = ({ isOpen, onClose, snapshot }: SnapshotViewerProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const editorRef = useRef<EditorView | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Setup theme compartments for dynamic changes
  const themeCompartment = useMemo(() => new Compartment(), []);
  const highlightCompartment = useMemo(() => new Compartment(), []);

  // Memoize highlight style for performance
  const getHighlightStyle = useMemo(() => {
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
      { tag: tags.constant(tags.variableName), color: COLORS.constant },
      { tag: tags.operator, color: COLORS.operator },

      // Markdown Style
      { tag: tags.heading, color: COLORS.heading },
      { tag: tags.heading1, color: COLORS.heading, fontSize: "1.2em" },
      { tag: tags.heading2, color: COLORS.heading, fontSize: "1.2em" },
      { tag: tags.heading3, color: COLORS.heading, fontSize: "1.1em" },
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
        fontSize: "14px",
        padding: "16px",
        lineHeight: "1.6",
        maxWidth: "100%",
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

    return { epheHighlightStyle, theme };
  }, [isDarkMode]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  // Create or update editor when snapshot changes
  useEffect(() => {
    if (isOpen && snapshot && containerRef.current) {
      // Clean up previous editor if it exists
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }

      // Get highlight styles
      const { epheHighlightStyle, theme } = getHighlightStyle;

      // Create editor state
      const state = EditorState.create({
        doc: snapshot.content,
        extensions: [
          EditorView.editable.of(false), // Read-only
          EditorView.lineWrapping,

          markdown({
            base: markdownLanguage,
            codeLanguages: languages,
          }),

          themeCompartment.of(EditorView.theme(theme)),
          highlightCompartment.of(syntaxHighlighting(epheHighlightStyle, { fallback: true })),
        ],
      });

      // Create editor view
      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      // Store the view reference
      editorRef.current = view;
      setIsLoading(false);
    }

    return () => {
      // Cleanup on unmount
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [isOpen, snapshot, getHighlightStyle, themeCompartment, highlightCompartment]);

  // Update theme when dark mode changes
  useEffect(() => {
    if (editorRef.current) {
      const { epheHighlightStyle, theme } = getHighlightStyle;
      editorRef.current.dispatch({
        effects: [
          themeCompartment.reconfigure(EditorView.theme(theme)),
          highlightCompartment.reconfigure(syntaxHighlighting(epheHighlightStyle, { fallback: true })),
        ],
      });
    }
  }, [getHighlightStyle, themeCompartment, highlightCompartment]);

  if (!isOpen || !snapshot) return null;

  const formattedDate = new Date(snapshot.timestamp).toLocaleString();

  // Export the snapshot as a file
  const handleExport = () => {
    if (!snapshot) return;

    const blob = new Blob([snapshot.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    const fileName = `${snapshot.title.replace(/[/\\?%*:|"<>]/g, "-")}.md`;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = () => {
    if (!snapshot) return;
    localStorage.setItem(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, snapshot.content);

    showToast("Snapshot restored", "success");
    navigate("/");
    onClose();
  };

  const handleDelete = () => {
    if (!snapshot) return;
    snapshotStorage.deleteById(snapshot.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-gray-200 border-b p-4 dark:border-gray-700">
          <div>
            <h3 className="font-medium text-gray-900 text-lg dark:text-gray-100">{snapshot.title}</h3>
            <p className="text-gray-500 text-sm dark:text-gray-400">
              {formattedDate} • {snapshot.charCount.toLocaleString()} characters
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Close</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {snapshot.description && (
          <div className="border-gray-200 border-b px-4 py-2 dark:border-gray-700">
            <p className="text-gray-600 text-sm dark:text-gray-400">{snapshot.description}</p>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {isLoading && <Loading className="flex h-full w-full items-center justify-center" />}
          <div ref={containerRef} className="h-full w-full" />
        </div>

        <div className="flex justify-between border-gray-200 border-t p-4 dark:border-gray-700">
          <div className="flex space-x-2">
            <button
              onClick={handleRestore}
              className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              type="button"
            >
              Restore
            </button>

            <button
              onClick={handleExport}
              className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              type="button"
            >
              Export
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleDelete}
              className="rounded-md bg-gray-100 px-4 py-2 text-red-600 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-gray-600"
              type="button"
            >
              Delete
            </button>

            <button
              onClick={onClose}
              className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
