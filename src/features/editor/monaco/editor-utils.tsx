import * as monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import { isTaskLine, isClosedTaskLine } from "./task-list-utils";
import { generateTaskIdentifier } from "../../tasks/task-storage";
import { findTaskSection } from "./task-section-utils";
import { saveCompletedTask, deleteCompletedTaskByIdentifier } from "../../tasks/task-storage";

// Helper functions for placeholder visibility
export const showPlaceholder = (element: Element) => {
  element.classList.remove("opacity-0");
  element.classList.add("opacity-100");
};

export const hidePlaceholder = (element: Element) => {
  element.classList.remove("opacity-100");
  element.classList.add("opacity-0");
};

// Add a new function to create decorations for task checkboxes
export const applyTaskCheckboxDecorations = (
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel | null,
): void => {
  if (!model) return;

  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  const lineCount = model.getLineCount();

  // TODO: use getLinesContent()

  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    const lineContent = model.getLineContent(lineNumber);

    if (isTaskLine(lineContent)) {
      // Find the checkbox position
      const checkboxStartIndex = lineContent.indexOf("- [");
      if (checkboxStartIndex === -1) continue;

      // Calculate the column positions
      const startColumn = checkboxStartIndex + 1; // Start at the "-"
      const endColumn = startColumn + 5; // End after the checkbox character (covers "- [ ]" or "- [x]")

      decorations.push({
        range: new monaco.Range(lineNumber, startColumn, lineNumber, endColumn),
        options: {
          inlineClassName: "cursor-pointer",
        },
      });
    }
  }

  editor.createDecorationsCollection(decorations);
};

export const editorOptions: EditorProps["options"] = {
  minimap: { enabled: false },
  lineNumbers: "off",
  wordWrap: "on",
  wordWrapColumn: 100,
  wordBreak: "normal",
  wrappingIndent: "same",
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  lineHeight: 24,
  glyphMargin: false,
  folding: false,
  renderLineHighlight: "none",
  scrollBeyondLastLine: false,
  renderWhitespace: "none",
  fontFamily: "monospace", // cause problems?
  fontSize: 14,
  contextmenu: false,
  scrollbar: {
    vertical: "hidden",
    horizontal: "hidden",
    verticalScrollbarSize: 0,
    horizontalScrollbarSize: 0,
    verticalSliderSize: 0,
    horizontalSliderSize: 0,
    alwaysConsumeMouseWheel: false,
  },
  guides: {
    bracketPairs: false,
    bracketPairsHorizontal: false,
    indentation: false,
    highlightActiveIndentation: false,
    highlightActiveBracketPair: false,
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
  selectionHighlight: false,
  renderControlCharacters: false,
  renderLineHighlightOnlyWhenFocus: true,
  maxTokenizationLineLength: 5000,
  padding: { top: 4 }, // Add padding to prevent cursor from being cut off
  stickyScroll: {
    enabled: false,
    scrollWithEditor: false,
  },
  stickyTabStops: false,
  cursorBlinking: "smooth",
  cursorStyle: "line", // line-thin?
  unicodeHighlight: {
    nonBasicASCII: false,
    ambiguousCharacters: false,
  },
  occurrencesHighlight: "off",
};

// Set up placeholder when editor content is empty
export const updatePlaceholder = (content: string) => {
  const placeholderElement = document.querySelector(".monaco-placeholder");
  if (!placeholderElement) return;

  const isContentEmpty = !content || !content.trim();
  if (isContentEmpty) {
    // Delay showing placeholder to avoid flickering during IME input
    setTimeout(() => {
      if (!content || !content.trim()) {
        showPlaceholder(placeholderElement);
      }
    }, 300);
  } else {
    hidePlaceholder(placeholderElement);
  }
};

// Handle keyboard events
export const handleKeyDown = (
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
export const handleTaskListAutoComplete = (
  e: monaco.IKeyboardEvent,
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel | null,
  position: monaco.Position | null,
): boolean => {
  if (!model || !position) return false;
  if (e.keyCode !== monaco.KeyCode.BracketLeft) return false;

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

// Handle task checkbox toggle on click
export const handleTaskCheckboxToggle = (
  e: monaco.editor.IEditorMouseEvent,
  editor: monaco.editor.IStandaloneCodeEditor,
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
    if (!isTaskLine(lineContent)) return;

    // Find the exact position of the checkbox in the line
    const checkboxStartIndex = lineContent.indexOf("- [");
    if (checkboxStartIndex === -1) return;

    // Calculate the column positions (Monaco columns start at 1, not 0)
    const checkboxColumn = checkboxStartIndex + 3 + 1; // +3 for "- [", +1 for Monaco's 1-based columns

    // Expand the click area slightly around the checkbox
    const clickAreaStart = checkboxStartIndex + 1; // Start at the "-"
    const clickAreaEnd = checkboxColumn + 3; // End after the checkbox character

    // Check if click is within the checkbox area
    if (position.column >= clickAreaStart && position.column <= clickAreaEnd) {
      const isChecked = isClosedTaskLine(lineContent);
      const newState = isChecked ? " " : "x";

      // - [ ] = 5 characters
      const taskContent = lineContent.substring(checkboxStartIndex + 5).trim();

      const section = model ? findTaskSection(model, position.lineNumber) : undefined;
      const taskIdentifier = generateTaskIdentifier(taskContent);

      if (newState === "x") {
        // If task is being checked, save it to history
        saveCompletedTask({
          id: taskIdentifier,
          content: taskContent,
          originalLine: lineContent,
          taskIdentifier,
          section,
          completedAt: new Date().toISOString(),
        });
      } else {
        // If task is being unchecked, remove it from history
        deleteCompletedTaskByIdentifier(taskIdentifier);
      }

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

export const EPHE_LIGHT_THEME = {
  name: "ephe-light",
  theme: {
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
      "editor.background": "#00000000",
      "editor.foreground": "#3a4550",
    },
  } as monaco.editor.IStandaloneThemeData,
} as const;

export const EPHE_DARK_THEME = {
  name: "ephe-dark",
  theme: {
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
      "editor.background": "#00000000",
      "editor.foreground": "#d6d9dd",
    },
  } as monaco.editor.IStandaloneThemeData,
} as const;
