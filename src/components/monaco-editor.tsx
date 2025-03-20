import * as monaco from "monaco-editor";
import type { EditorProps } from "@monaco-editor/react";
import { isTaskListLine, isCheckedTask } from "../features/monaco/task-list-utils";

// Helper functions for placeholder visibility
export const showPlaceholder = (element: Element) => {
  element.classList.remove("opacity-0");
  element.classList.add("opacity-100");
};

export const hidePlaceholder = (element: Element) => {
  element.classList.remove("opacity-100");
  element.classList.add("opacity-0");
};

export const editorOptions: EditorProps["options"] = {
  minimap: { enabled: false },
  lineNumbers: "off",
  wordWrap: "on",
  wordBreak: "normal",
  wrappingIndent: "same",
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  glyphMargin: false,
  folding: false,
  renderLineHighlight: "none",
  scrollBeyondLastLine: false,
  renderWhitespace: "none",
  fontFamily: "monospace", // cause problems?
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
};

// Set up placeholder when editor is empty
export const updatePlaceholder = (editorValue: string) => {
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
    if (position.column >= clickAreaStart && position.column <= clickAreaEnd) {
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
