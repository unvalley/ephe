import { indentMore, indentLess } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { type KeyBinding, type EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { isTaskLine, isTaskLineEndsWithSpace, isRegularListLine, isEmptyListLine } from "./task-list-utils";

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

      // Check if cursor is at the end of line
      if (pos === line.to) {
        // Handle task lists
        if (isTaskLine(line.text)) {
          // If it's an empty task line (ends with space), delete it
          if (isTaskLineEndsWithSpace(line.text)) {
            const from = line.from;
            let to = line.to;
            let newCursorPos = from;

            // Include the newline character in deletion if it exists
            if (line.to < state.doc.length) {
              to += 1; // Include newline character
              newCursorPos = from;
            } else if (line.from > 0) {
              newCursorPos = from;
            }

            view.dispatch({
              changes: { from: from, to: to },
              selection: { anchor: newCursorPos },
            });
            return true;
          }

          // If it's a task line with content, create a new task item
          const match = line.text.match(/^(\s*)([-*]) \[[ xX]\]/);
          if (match) {
            const indent = match[1];
            const bullet = match[2];
            const newTaskLine = `\n${indent}${bullet} [ ] `;

            view.dispatch({
              changes: { from: pos, insert: newTaskLine },
              selection: { anchor: pos + newTaskLine.length },
            });
            return true;
          }
        }

        // Handle regular lists (non-task lists)
        if (isRegularListLine(line.text)) {
          // If it's an empty list line, delete it
          if (isEmptyListLine(line.text)) {
            const from = line.from;
            let to = line.to;
            let newCursorPos = from;

            // Include the newline character in deletion if it exists
            if (line.to < state.doc.length) {
              to += 1; // Include newline character
              newCursorPos = from;
            } else if (line.from > 0) {
              newCursorPos = from;
            }

            view.dispatch({
              changes: { from: from, to: to },
              selection: { anchor: newCursorPos },
            });
            return true;
          }

          // If it's a list line with content, create a new list item
          const match = line.text.match(/^(\s*)([-*+])\s+(.*)$/);
          if (match && match[3].trim() !== "") {
            // Only if there's actual content
            const indent = match[1];
            const bullet = match[2];
            const newListLine = `\n${indent}${bullet} `;

            view.dispatch({
              changes: { from: pos, insert: newListLine },
              selection: { anchor: pos + newListLine.length },
            });
            return true;
          }
        }
      }

      // Fall back to default behavior (Markdown list continuation, etc.)
      return false;
    },
  },
  {
    key: "Tab",
    run: (view: EditorView): boolean => {
      const { state } = view;
      if (state.readOnly || state.selection.ranges.length > 1) return false;
      if (!state.selection.main.empty) {
        return indentMore(view);
      }

      const { head } = state.selection.main;
      const currentLine = state.doc.lineAt(head);
      const currentLineText = currentLine.text;

      // Handle both task lines and regular list lines
      if (!isTaskLine(currentLineText) && !isRegularListLine(currentLineText)) {
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

        // Apply nesting logic for both task lines and regular list lines
        const isCurrentTask = isTaskLine(currentLineText);
        const isCurrentRegularList = isRegularListLine(currentLineText);
        const isPrevTask = isTaskLine(prevLineText);
        const isPrevRegularList = isRegularListLine(prevLineText);

        // Allow indenting if previous line is the same type (task or regular list)
        if ((isCurrentTask && isPrevTask) || (isCurrentRegularList && isPrevRegularList)) {
          const prevIndentLength = getIndentLength(prevLineText);

          // Prevent nesting more than one level deeper than the previous line
          const maxAllowedIndent = prevIndentLength + indentUnitLength;
          const newIndentLength = currentIndentLength + indentUnitLength;

          if (newIndentLength > maxAllowedIndent) {
            return true; // Block the tab if it would create too deep nesting
          }

          // Allow indenting within the limit
          return indentMore(view);
        }

        // If previous line is not the same type, block indenting for nested items
        if ((isCurrentTask || isCurrentRegularList) && currentIndentLength > 0) {
          return true; // Block indent for nested items without suitable sibling
        }
      }

      // Use default indentMore for all other cases
      return indentMore(view);
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

      // Handle both task lines and regular list lines that start with indent
      if (empty && line.text.startsWith(INDENT_SPACE) && (isTaskLine(line.text) || isRegularListLine(line.text))) {
        view.dispatch({
          changes: { from: line.from, to: line.from + INDENT_SPACE.length, insert: "" },
          userEvent: "delete.dedent",
        });
        return true;
      }

      // Fall back to default behavior for non-list lines or lines without indent
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
