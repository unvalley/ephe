import { indentMore, indentLess } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { type KeyBinding, type EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { isTaskLine, isTaskLineEndsWithSpace } from "./task-list-utils";

const INDENT_SPACE = "  ";

// Regular expression to get leading whitespace
const leadingWhitespaceRegex = /^(\s*)/;

// Calculate just number of spaces
const getIndentLength = (lineText: string): number => {
  const match = lineText.match(leadingWhitespaceRegex);
  return match ? match[1].length : 0;
};

export const taskKeyBindings: readonly KeyBinding[] = [
  {
    key: "Enter",
    run: (view: EditorView): boolean => {
      const { state } = view;
      const { selection } = state;

      // Handle only single cursor with no selection
      if (!selection.main.empty || selection.ranges.length > 1) {
        return false;
      }

      const pos = selection.main.head;
      const line = state.doc.lineAt(pos);

      // Process only when cursor is at the end of line and it's an empty task item
      if (pos === line.to && isTaskLineEndsWithSpace(line.text)) {
        // Delete the entire empty task item line
        const from = line.from;
        let to = line.to;
        let newCursorPos = from;

        // Include the newline character in deletion if it exists
        if (line.to < state.doc.length) {
          to += 1; // Include newline character
          // Cursor stays at the beginning of where the deleted line was
          newCursorPos = from;
        } else if (line.from > 0) {
          // For the last line, if there are previous lines, don't delete the newline
          // but place cursor at the beginning of the (now empty) last line
          newCursorPos = from;
        }

        view.dispatch({
          changes: { from: from, to: to },
          selection: { anchor: newCursorPos },
        });
        return true;
      }

      // Fall back to default behavior (Markdown list continuation, etc.)
      return false;
    },
  },
  {
    key: "Tab",
    run: (view: EditorView): boolean => {
      const { state, dispatch } = view;
      if (state.readOnly || state.selection.ranges.length > 1) return false;
      if (!state.selection.main.empty) {
        return indentMore(view);
      }

      const { head } = state.selection.main;
      const currentLine = state.doc.lineAt(head);
      const currentLineText = currentLine.text;

      if (!isTaskLine(currentLineText)) {
        return indentMore(view);
      }

      const currentIndentLength = getIndentLength(currentLineText);
      const indentUnitStr = state.facet(indentUnit);
      const indentUnitLength = indentUnitStr.length;

      // Skip if indent unit is invalid
      if (indentUnitLength <= 0) {
        return false;
      }

      // Check previous line if current line is not the first
      if (currentLine.number > 1) {
        const prevLine = state.doc.line(currentLine.number - 1);
        const prevLineText = prevLine.text;

        if (isTaskLine(prevLineText)) {
          const prevIndentLength = getIndentLength(prevLineText);
          if (currentIndentLength === prevIndentLength) {
            dispatch({
              changes: { from: currentLine.from, insert: indentUnitStr },
              userEvent: "input.indent.task",
            });
            return true;
          }

          if (currentIndentLength > prevIndentLength) {
            return true;
          }
        }
      }

      // Cases that reach here:
      // 1. Current line is the first line (currentLine.number === 1)
      // 2. Previous line is not a checklist item
      // 3. Previous line is a checklist item but with different indent level

      // For root level (indent 0) items, try default indentMore
      if (currentIndentLength === 0) {
        return indentMore(view);
      }
      // Block Tab indent for already indented items without suitable sibling above
      return true;
    },
  },
  {
    key: "Shift-Tab",
    run: (view: EditorView): boolean => {
      const { state } = view;
      if (state.readOnly) return false;
      const { head, empty } = state.selection.main;
      // For range selection or single cursor with indent unit at line start
      const line = state.doc.lineAt(head);
      if (empty && line.text.startsWith(INDENT_SPACE)) {
        view.dispatch({
          changes: { from: line.from, to: line.from + INDENT_SPACE.length, insert: "" },
          userEvent: "delete.dedent",
        });
        return true;
      }
      return indentLess(view);
    },
  },
  {
    key: "Delete",
    mac: "Backspace",
    run: (view: EditorView): boolean => {
      const { state } = view;
      const { selection } = state;

      // Use default behavior for selections or multiple cursors
      if (!selection.main.empty || selection.ranges.length > 1) {
        return false;
      }

      const pos = selection.main.head;
      const line = state.doc.lineAt(pos);

      // Use default behavior if cursor is not at line end
      // (Allow normal character deletion when Delete is pressed in the middle of line)
      if (pos !== line.to) {
        return false;
      }

      if (isTaskLineEndsWithSpace(line.text)) {
        // Matched case: entire line is `- [ ]` (or - [x] etc.) with only whitespace

        // Create transaction to delete the line
        const from = line.from;
        let to = line.to;

        // Include newline character in deletion if it exists after the line
        // (Prevent unintended indentation of next line)
        // However, don't delete newline for the last line of document
        if (line.to < state.doc.length) {
          to += 1; // Include newline character
        } else {
          // For last line that's not also the first line,
          // adjustment might be needed to avoid deleting previous line's newline
          // For now, keep it simple: don't delete newline for last line
          if (line.from > 0) {
            // Adjust from to not delete previous newline? No, deleting entire line is intuitive.
            // Keep it simple: don't delete newline for last line
          }
        }
        // For first line, don't delete newline to avoid merging with next line
        if (line.from === 0 && line.to < state.doc.length) {
          to = line.to;
        }

        // Final deletion range
        const changes = { from: from, to: to };
        // Place cursor at deletion start position
        const selectionAfter = { anchor: from };

        view.dispatch({
          changes: changes,
          selection: selectionAfter,
          userEvent: "delete.task",
        });

        return true; // Suppress default Delete behavior
      }

      // Use default Delete behavior if pattern doesn't match
      return false;
    },
  },
];

export const taskKeyMap = Prec.high(keymap.of(taskKeyBindings));
