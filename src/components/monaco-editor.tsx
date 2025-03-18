"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "../hooks/use-local-storage";
import { useDebouncedCallback } from "../hooks/use-debounce";
import type * as monaco from "monaco-editor";
import { Editor } from "@monaco-editor/react";
import type { EditorProps } from "@monaco-editor/react";
import type React from "react";
import { isTaskListLine, isCheckedTask } from "./task-list-utils";
import { useTheme } from "../hooks/use-theme";
import { MonacoMarkdownExtension } from "../monaco-markdown";
import { KeyCode } from "monaco-editor";

const markdownExtension = new MonacoMarkdownExtension();

const EDITOR_CONTENT_KEY = "editor-content";

const WRITING_QUOTES = [
  "The scariest moment is always just before you start.",
  "Fill your paper with the breathings of your heart.",
  "The pen is mightier than the sword.",
  "The best way to predict the future is to invent it.",
  "The only way to do great work is to love what you do.",
  "A word after a word after a word is power.",
  "Get things done.",
  "Later equals never.",
  "Divide and conquer.",
];

// Helper functions
const getRandomQuote = (): string => {
  return WRITING_QUOTES[Math.floor(Math.random() * WRITING_QUOTES.length)];
};

type MonacoEditorProps = {
  editorRef?: React.RefObject<{ focus: () => void } | undefined>;
  onWordCountChange?: (count: number) => void;
};

export const MonacoEditor = ({
  editorRef,
  onWordCountChange,
}: MonacoEditorProps): React.ReactElement => {
  const [content, setContent] = useLocalStorage<string>(EDITOR_CONTENT_KEY, "");
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [placeholder, setPlaceholder] = useState<string>(getRandomQuote());
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [isEditorLoading, setIsEditorLoading] = useState(true);

  const debouncedSetContent = useDebouncedCallback((newContent: string) => {
    setContent(newContent);
  }, 400);

  // Create a debounced function for character count updates
  const debouncedCharCountUpdate = useDebouncedCallback(
    (text: string) => {
      if (onWordCountChange) {
        onWordCountChange(text.length);
      }
    },
    50, // Faster updates for character count
  );

  // Handle editor mounting
  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor"),
  ) => {
    monacoRef.current = editor;
    setIsEditorLoading(false);

    // Initialize markdown extension
    markdownExtension.activate(editor);

    // Handle task checkbox toggle on click
    const handleTaskCheckboxToggle = (
      e: monaco.editor.IEditorMouseEvent,
      model: monaco.editor.ITextModel | null,
    ): boolean | undefined => {
      try {
        if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
          return;
        }

        if (!model) return;

        const position = e.target.position;
        if (!position) return;

        const lineContent = model.getLineContent(position.lineNumber);

        if (!isTaskListLine(lineContent)) return;

        // Find the exact position of the checkbox in the line
        const checkboxStartIndex = lineContent.indexOf("- [");
        if (checkboxStartIndex === -1) return;

        // Calculate the column positions (Monaco columns start at 1, not 0)
        const checkboxColumn = checkboxStartIndex + 3 + 1; // +3 for "- [", +1 for Monaco's 1-based columns

        // Expand the click area slightly around the checkbox
        const clickAreaStart = checkboxStartIndex + 1; // Start at the "-"
        const clickAreaEnd = checkboxColumn + 1; // End after the checkbox character

        // Check if click is within the checkbox area
        if (
          position.column >= clickAreaStart &&
          position.column <= clickAreaEnd
        ) {
          // Get the current state of the checkbox
          const isChecked = isCheckedTask(lineContent);

          // Toggle checkbox state
          const newState = isChecked ? " " : "x";

          // Apply the edit to toggle checkbox - only change the checkbox character
          editor.executeEdits("", [
            {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: checkboxColumn,
                endLineNumber: position.lineNumber,
                endColumn: checkboxColumn + 1,
              },
              text: newState,
            },
          ]);

          // Return false to prevent default handling
          return false;
        }
      } catch (error) {
        console.error("Error in checkbox toggle:", error);
        return;
      }
    };

    // Add decorations for checked tasks
    const updateDecorations = (model: monaco.editor.ITextModel | null) => {
      if (!model) return;
      try {
        const oldDecorations = model.getAllDecorations() || [];
        const decorations: monaco.editor.IModelDeltaDecoration[] = [];

        for (
          let lineNumber = 1;
          lineNumber <= model.getLineCount();
          lineNumber++
        ) {
          const lineContent = model.getLineContent(lineNumber);

          // Only process task list lines
          if (isTaskListLine(lineContent)) {
            // Add decoration for completed tasks
            if (isCheckedTask(lineContent)) {
              decorations.push({
                range: new monaco.Range(
                  lineNumber,
                  1, // Start from beginning of line
                  lineNumber,
                  lineContent.length + 1, // To the end of the line
                ),
                options: {
                  inlineClassName: "task-completed-line",
                  isWholeLine: true,
                  stickiness:
                    monaco.editor.TrackedRangeStickiness
                      .GrowsOnlyWhenTypingBefore,
                },
              });
            }
          }
        }

        const oldIds = oldDecorations
          .filter((d) => d.options.inlineClassName === "task-completed-line")
          .map((d) => d.id);

        editor.deltaDecorations(oldIds, decorations);
      } catch (error) {
        console.error("Error updating decorations:", error);
      }
    };

    // Add event handlers
    editor.onKeyDown((e) =>
      handleKeyDown(e, editor, editor.getModel(), editor.getPosition()),
    );
    editor.onMouseDown((e) => handleTaskCheckboxToggle(e, editor.getModel()));

    // Update placeholder and decorations on content change
    editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      const model = editor.getModel();

      updatePlaceholder(value);
      updateDecorations(model);
      debouncedSetContent(value);
      debouncedCharCountUpdate(value);
    });

    // Initial setup
    updatePlaceholder(editor.getValue());
    updateDecorations(editor.getModel());

    // Initial character count - direct calculation for initial load
    if (onWordCountChange) {
      onWordCountChange(editor.getValue().length);
    }

    // Focus editor on mount
    editor.focus();

    // Define custom themes
    monaco.editor.defineTheme("ephe-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#8a9aa9", fontStyle: "italic" },
        { token: "keyword", foreground: "#5d5080" },
        { token: "string", foreground: "#457464" },
        { token: "number", foreground: "#a37a55" },
        { token: "type", foreground: "#44678a" },
        { token: "function", foreground: "#4a768f" },
        { token: "variable", foreground: "#566370" },
        { token: "constant", foreground: "#9e6b60" },
        { token: "operator", foreground: "#6d5e96" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#3a4550",
      },
    });

    monaco.editor.defineTheme("ephe-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#8a9aa9", fontStyle: "italic" },
        { token: "keyword", foreground: "#a08cc0" },
        { token: "string", foreground: "#7fb49a" },
        { token: "number", foreground: "#c79d7f" },
        { token: "type", foreground: "#7a9cbf" },
        { token: "function", foreground: "#7c9cb3" },
        { token: "variable", foreground: "#d6d9dd" },
        { token: "constant", foreground: "#c99a90" },
        { token: "operator", foreground: "#a99ac6" },
      ],
      colors: {
        "editor.background": "#121212",
        "editor.foreground": "#d6d9dd",
      },
    });
    // Apply custom theme
    monaco.editor.setTheme(isDarkMode ? "ephe-dark" : "ephe-light");
  };

  // Expose focus method to parent component through ref
  useEffect(() => {
    if (editorRef && monacoRef.current) {
      editorRef.current = {
        focus: () => monacoRef.current?.focus(),
      };
    }
  }, [editorRef]);

  // Determine if placeholder should be visible initially
  const shouldShowPlaceholder =
    !isEditorLoading && (!content || !content.trim());

  return (
    // Container wrapper - controls the width constraints and horizontal centering
    <div className="w-full max-w-2xl mx-auto relative h-full rounded-md overflow-hidden px-4 sm:px-6 md:px-0">
      {/* Placeholder element that shows when editor is empty */}
      <div
        className={`monaco-placeholder text-md absolute left-0.5 top-1 text-gray-400 dark:text-gray-500 pointer-events-none z-[1] transition-opacity duration-300 px-4 sm:px-2 ${shouldShowPlaceholder ? "opacity-100" : "opacity-0"}`}
        aria-hidden={!shouldShowPlaceholder}
      >
        {placeholder}
      </div>

      {/* Monaco Editor wrapper */}
      <Editor
        height="100%"
        width="100%"
        defaultLanguage="markdown"
        defaultValue={content}
        options={{
          ...editorOptions,
          padding: { top: 4 }, // Add padding to prevent cursor from being cut off
        }}
        onMount={handleEditorDidMount}
        className="overflow-visible"
        loading=""
        theme={isDarkMode ? "ephe-dark" : "ephe-light"}
      />
    </div>
  );
};

// Helper functions for placeholder visibility
const showPlaceholder = (element: Element) => {
  element.classList.remove("opacity-0");
  element.classList.add("opacity-100");
};

const hidePlaceholder = (element: Element) => {
  element.classList.remove("opacity-100");
  element.classList.add("opacity-0");
};

const editorOptions: EditorProps["options"] = {
  minimap: { enabled: false },
  lineNumbers: "off",
  wordWrap: "on",
  wrappingIndent: "same",
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  glyphMargin: false,
  folding: false,
  renderLineHighlight: "none",
  scrollBeyondLastLine: false,
  renderWhitespace: "none",
  //   fontFamily: "monospace",
  fontSize: 14,
  contextmenu: false,
  scrollbar: {
    vertical: "auto",
    horizontal: "auto",
    verticalScrollbarSize: 0,
    horizontalScrollbarSize: 0,
    verticalSliderSize: 0,
    horizontalSliderSize: 0,
    alwaysConsumeMouseWheel: false,
  },
  overviewRulerBorder: false,
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  renderValidationDecorations: "off",
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: "off",
  tabCompletion: "off",
  parameterHints: { enabled: false },
};

// Set up placeholder when editor is empty
const updatePlaceholder = (editorValue: string) => {
  const placeholderElement = document.querySelector(".monaco-placeholder");
  if (!placeholderElement) return;

  const isContentEmpty = !editorValue || !editorValue.trim();
  if (isContentEmpty) {
    // Delay showing placeholder to avoid flickering during IME input
    setTimeout(() => {
      if (!editorValue || !editorValue.trim()) {
        showPlaceholder(placeholderElement);
      }
    }, 300);
  } else {
    hidePlaceholder(placeholderElement);
  }
};

// Handle keyboard events
const handleKeyDown = (
  e: monaco.IKeyboardEvent,
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel | null,
  position: monaco.Position | null,
): void => {
  if (!model) return;

  // Auto-complete task list syntax
  handleTaskListAutoComplete(e, editor, model, position);
  return;
};

// Handle auto-complete for task list syntax
const handleTaskListAutoComplete = (
  e: monaco.IKeyboardEvent,
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel | null,
  position: monaco.Position | null,
): boolean => {
  if (!model || !position) return false;
  if (e.keyCode !== KeyCode.BracketLeft) return false;

  const lineContent = model.getLineContent(position.lineNumber);
  const textBeforeCursor = lineContent.substring(0, position.column - 1);

  // Check if the user just typed "-["
  if (textBeforeCursor.endsWith("-")) {
    e.preventDefault();
    editor.executeEdits("", [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column - 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text: "- [ ] ",
      },
    ]);
    return true;
  }

  // Check if the user just typed "- ["
  if (textBeforeCursor.endsWith("- ")) {
    e.preventDefault();
    editor.executeEdits("", [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text: "[ ] ",
      },
    ]);
    return true;
  }

  return false;
};
// Need to use default export since this is a CSR component loaded with dynamic import
export default MonacoEditor;
