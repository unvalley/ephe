import type { TextEditor, TextEditorEdit } from "./vscode-monaco";

import { isInFencedCodeBlock } from "./util";
import { KeyCode, KeyMod, type Thenable } from "monaco-editor";
import { Position, WorkspaceEdit, Range, Selection, TextEditorRevealType } from "./ext-host-types";
import { addKeybinding } from "./formatting";
import { isTaskLine } from "../task-list-utils";

const onShiftTabKey = (editor: TextEditor) => {
  onTabKey(editor, "shift");
};

export const activateListEditing = (editor: TextEditor) => {
  const editorContext = "editorTextFocus && !editorReadonly && !suggestWidgetVisible";
  addKeybinding(editor, "onEnterKey", onEnterKey, [KeyCode.Enter], "", editorContext, "");
  addKeybinding(editor, "onCtrlEnterKey", onCtrlEnterKey, [KeyCode.Enter | KeyMod.CtrlCmd], "", editorContext, "");
  addKeybinding(editor, "onShiftEnterKey", onShiftEnterKey, [KeyCode.Enter | KeyMod.Shift], "", editorContext, "");
  addKeybinding(editor, "onTabKey", onTabKey, [KeyCode.Tab], "", editorContext, "");
  addKeybinding(editor, "onShiftTabKey", onShiftTabKey, [KeyCode.Tab | KeyMod.Shift], "", editorContext, "");
  addKeybinding(editor, "onBackspaceKey", onBackspaceKey, [KeyCode.Backspace], "", editorContext, "");
};

const onShiftEnterKey = (editor: TextEditor) => {
  onEnterKey(editor, "shift");
};

const onCtrlEnterKey = (editor: TextEditor) => {
  onEnterKey(editor, "ctrl");
};

function onEnterKey(editor: TextEditor, modifiers?: string) {
  const cursorPos: Position = editor.selection.active;
  const line = editor.document.lineAt(cursorPos.line);
  const textBeforeCursor = line.text.substring(0, cursorPos.character);
  const textAfterCursor = line.text.substring(cursorPos.character);

  let lineBreakPos = cursorPos;
  if (modifiers === "ctrl") {
    lineBreakPos = line.range.end;
  }

  if (modifiers === "shift" || isInFencedCodeBlock(editor.document, cursorPos.line)) {
    return asNormal(editor, "enter", modifiers);
  }

  // If it's an empty list item, remove it
  if (/^(>|([-+*]|[0-9]+[.)])( +\[[ x]\])?)$/.test(textBeforeCursor.trim()) && textAfterCursor.trim().length === 0) {
    return editor
      .edit((editBuilder: TextEditorEdit) => {
        editBuilder.delete(line.range);
        editBuilder.insert(line.range.end, "\n");
      })
      .then(() => {
        editor.revealRange(editor.selection, TextEditorRevealType.Default);
      })
      .then(() => fixMarker(editor, findNextMarkerLineNumber(editor)));
  }

  let matches: RegExpExecArray | null;
  if (/^> /.test(textBeforeCursor)) {
    // Quote block
    return editor
      .edit((editBuilder: TextEditorEdit) => {
        editBuilder.insert(lineBreakPos, "\n> ");
      })
      .then(() => {
        // Fix cursor position
        if (modifiers === "ctrl" && !cursorPos.isEqual(lineBreakPos)) {
          const newCursorPos = cursorPos.with(line.lineNumber + 1, 2);
          editor.selection = new Selection(newCursorPos, newCursorPos);
        }
      })
      .then(() => {
        editor.revealRange(editor.selection, TextEditorRevealType.Default);
      });
  }

  matches = /^(\s*[-+*] +(\[[ x]\] +)?)/.exec(textBeforeCursor);
  if (matches !== null) {
    // Unordered list
    const matchedPrefix = matches[1];
    return editor
      .edit((editBuilder: TextEditorEdit) => {
        editBuilder.insert(lineBreakPos, `\n${matchedPrefix.replace("[x]", "[ ]")}`);
      })
      .then(() => {
        // Fix cursor position
        if (modifiers === "ctrl" && !cursorPos.isEqual(lineBreakPos)) {
          const newCursorPos = cursorPos.with(line.lineNumber + 1, matchedPrefix.length);
          editor.selection = new Selection(newCursorPos, newCursorPos);
        }
      })
      .then(() => {
        editor.revealRange(editor.selection, TextEditorRevealType.Default);
      });
  }

  matches = /^(\s*)([0-9]+)([.)])( +)((\[[ x]\] +)?)/.exec(textBeforeCursor);
  if (matches !== null) {
    // Ordered list
    const maybeConfig = editor.getConfiguration("markdown.extension.orderedList");
    const config = maybeConfig?.get<string>("marker") || "";

    let marker = "1";
    const leadingSpace = matches[1];
    const previousMarker = matches[2];
    const delimiter = matches[3];
    let trailingSpace = matches[4];
    const gfmCheckbox = matches[5].replace("[x]", "[ ]");
    const textIndent = (previousMarker + delimiter + trailingSpace).length;
    if (config === "ordered") {
      marker = String(Number(previousMarker) + 1);
    }
    // Add enough trailing spaces so that the text is aligned with the previous list item, but always keep at least one space
    trailingSpace = " ".repeat(Math.max(1, textIndent - (marker + delimiter).length));

    const toBeAdded = leadingSpace + marker + delimiter + trailingSpace + gfmCheckbox;
    return editor
      .edit(
        (editBuilder: TextEditorEdit) => {
          editBuilder.insert(lineBreakPos, `\n${toBeAdded}`);
        },
        { undoStopBefore: true, undoStopAfter: false },
      )
      .then(() => {
        // Fix cursor position
        if (modifiers === "ctrl" && !cursorPos.isEqual(lineBreakPos)) {
          const newCursorPos = cursorPos.with(line.lineNumber + 1, toBeAdded.length);
          editor.selection = new Selection(newCursorPos, newCursorPos);
        }
      })
      .then(() => fixMarker(editor))
      .then(() => {
        editor.revealRange(editor.selection, TextEditorRevealType.Default);
      });
  }

  return asNormal(editor, "enter", modifiers);
}

// Types for list indentation
type ListIndentationInfo = {
  leadingSpaces: number;
  indentLevel: number;
};

type ParentTaskInfo = {
  found: boolean;
  level: number;
};

/**
 * Gets the length of the task prefix (indentation + marker + checkbox)
 */
const getTaskPrefixLength = (lineText: string): number => {
  const match = /^(\s*)([-+*]|[0-9]+[.)]) +(\[[ x]\] +)?/.exec(lineText);
  return match ? match[0].length : 0;
};

/**
 * Gets list indentation information
 */
const getTaskIndentation = (lineText: string): ListIndentationInfo => {
  const match = /^(\s*)([-+*]|[0-9]+[.)]) +(\[[ x]\] +)?/.exec(lineText);
  if (!match) {
    return { leadingSpaces: 0, indentLevel: 0 };
  }

  const leadingSpaces = match[1].length;
  const indentLevel = Math.floor(leadingSpaces / 2); // Use 2 spaces as default, but this will be overridden by user settings

  return { leadingSpaces, indentLevel };
};

/**
 * Find the parent list item's indentation level
 */
const findParentTaskIndentation = (editor: TextEditor, line: number, currentIndent: number): ParentTaskInfo => {
  let prevLine = line - 1;

  while (prevLine >= 0) {
    const prevLineText = editor.document.lineAt(prevLine).text;

    // Check for both task lists and regular lists
    if (isTaskLine(prevLineText) || /^(\s*)([-+*]|[0-9]+[.)]) +/.test(prevLineText)) {
      const { indentLevel } = getTaskIndentation(prevLineText);

      // If this is a potential parent (less or same indentation)
      if (indentLevel <= currentIndent) {
        return { found: true, level: indentLevel };
      }
    }

    prevLine -= 1;
  }

  return { found: false, level: -1 };
};

/**
 * Handles tab key press for list items
 */
const onTabKey = (editor: TextEditor, modifiers?: string) => {
  const cursorPos = editor.selection.start;
  const lineText = editor.document.lineAt(cursorPos.line).text;
  const currentLine = cursorPos.line;

  // Skip if in code block
  if (isInFencedCodeBlock(editor.document, currentLine)) {
    return asNormal(editor, "tab", modifiers);
  }

  // Check if this is a list item
  const isListItem = /^(\s*)([-+*]|[0-9]+[.)]) +/.test(lineText);
  const isTaskListItem = isTaskLine(lineText);

  // Handle list item indentation
  if (
    (isListItem || isTaskListItem) &&
    (modifiers === "shift" ||
      !editor.selection.isEmpty ||
      (editor.selection.isEmpty && cursorPos.character <= getTaskPrefixLength(lineText)))
  ) {
    // Handle outdent
    if (modifiers === "shift") {
      return outdent(editor).then(() => fixMarker(editor));
    }

    // Get indentation info and check parent
    const { indentLevel } = getTaskIndentation(lineText);
    const parentInfo = findParentTaskIndentation(editor, currentLine, indentLevel);

    // Apply indentation rules:
    // 1. If no parent, only allow indent if at level 0
    // 2. If parent exists, only allow indent if at same level as parent
    if ((!parentInfo.found && indentLevel > 0) || (parentInfo.found && indentLevel > parentInfo.level)) {
      return Promise.resolve();
    }

    // Apply indentation if rules are satisfied
    return indent(editor).then(() => fixMarker(editor));
  }

  // Handle non-list items normally
  return asNormal(editor, "tab", modifiers);
};

const onBackspaceKey = (editor: TextEditor) => {
  const cursor = editor.selection.active;
  const document = editor.document;
  const textBeforeCursor = document.lineAt(cursor.line).text.substring(0, cursor.character);

  if (isInFencedCodeBlock(document, cursor.line)) {
    return asNormal(editor, "backspace");
  }

  if (!editor.selection.isEmpty) {
    return asNormal(editor, "backspace")?.then(() => fixMarker(editor, findNextMarkerLineNumber(editor)));
  }
  if (/^\s+([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
    // e.g. textBeforeCursor === `  - `, `   1. `
    return outdent(editor).then(() => fixMarker(editor));
  }
  if (/^([-+*]|[0-9]+[.)]) $/.test(textBeforeCursor)) {
    // e.g. textBeforeCursor === `- `, `1. `
    return editor
      .edit((editBuilder: TextEditorEdit) => {
        editBuilder.replace(new Range(cursor.with({ character: 0 }), cursor), " ".repeat(textBeforeCursor.length));
      })
      .then(() => fixMarker(editor, findNextMarkerLineNumber(editor)));
  }
  if (/^\s*([-+*]|[0-9]+[.)]) +(\[[ x]\] )$/.test(textBeforeCursor)) {
    // e.g. textBeforeCursor === `- [ ]`, `1. [x]`, `  - [x]`
    return deleteRange(editor, new Range(cursor.with({ character: textBeforeCursor.length - 4 }), cursor)).then(() =>
      fixMarker(editor, findNextMarkerLineNumber(editor)),
    );
  }
  return asNormal(editor, "backspace");
};

const asNormal = (editor: TextEditor, key: string, modifiers?: string): Thenable<void> | undefined => {
  switch (key) {
    case "enter":
      if (modifiers === "ctrl") {
        return editor.executeCommand("editor.action.insertLineAfter");
      }
      return editor.executeCommand("type", {
        source: "keyboard",
        text: "\n",
      });
    case "tab": {
      const maybeConfig = editor.getConfiguration("emmet");
      const config = maybeConfig?.get<boolean>("triggerExpansionOnTab") || false;
      if (config) {
        return editor.executeCommand("editor.emmet.action.expandAbbreviation");
      }
      if (modifiers === "shift") {
        return editor.executeCommand("editor.action.outdentLines");
      }
      return editor.executeCommand("tab");
    }
    case "backspace":
      return editor.executeCommand("deleteLeft");
  }
};

/**
 * If
 *
 * 1. it is not the first line
 * 2. there is a Markdown list item before this line
 *
 * then indent the current line to align with the previous list item.
 */
const indent = (editor: TextEditor): Thenable<void> => {
  const maybeConfig = editor.getConfiguration("markdown.extension.list");
  const config = maybeConfig?.get<string>("indentationSize") || "";
  if (config === "adaptive") {
    try {
      const selection = editor.selection;
      const startLine = selection.start.line;
      const indentationSize = tryDetermineIndentationSize(
        editor,
        startLine,
        editor.document.lineAt(startLine).firstNonWhitespaceCharacterIndex,
      );
      const edit = new WorkspaceEdit();
      for (let i = selection.start.line; i <= selection.end.line; i++) {
        if (i === selection.end.line && !selection.isEmpty && selection.end.character === 0) {
          break;
        }
        if (editor.document.lineAt(i).text.length !== 0) {
          const uri = editor.document.uri;
          if (!uri) {
            throw new Error("Document URI is not set");
          }
          edit.insert(uri, new Position(i, 0), " ".repeat(indentationSize));
        }
      }
      return editor.applyEdit(edit);
    } catch (error) {}
  }

  return editor.executeCommand("editor.action.indentLines");
};

/**
 * Similar to `indent`-function
 */
const outdent = (editor: TextEditor): Thenable<void> => {
  const maybeConfig = editor.getConfiguration("markdown.extension.list");
  const config = maybeConfig?.get<string>("indentationSize") || "";

  if (config === "adaptive") {
    try {
      const selection = editor.selection;
      const startLine = selection.start.line;
      const indentationSize = tryDetermineIndentationSize(
        editor,
        startLine,
        editor.document.lineAt(startLine).firstNonWhitespaceCharacterIndex,
      );
      const edit = new WorkspaceEdit();
      for (let i = selection.start.line; i <= selection.end.line; i++) {
        if (i === selection.end.line && !selection.isEmpty && selection.end.character === 0) {
          break;
        }
        const lineText = editor.document.lineAt(i).text;
        let maxOutdentSize: number;
        if (lineText.trim().length === 0) {
          maxOutdentSize = lineText.length;
        } else {
          maxOutdentSize = editor.document.lineAt(i).firstNonWhitespaceCharacterIndex;
        }
        if (maxOutdentSize > 0) {
          const uri = editor.document.uri;
          if (!uri) {
            throw new Error("Document URI is not set");
          }
          edit.delete(uri, new Range(i, 0, i, Math.min(indentationSize, maxOutdentSize)));
        }
      }
      return editor.applyEdit(edit);
    } catch (error) {}
  }

  return editor.executeCommand("editor.action.outdentLines");
};

/**
 * Determine indentation size based on previous list items
 */
const tryDetermineIndentationSize = (editor: TextEditor, originalLine: number, currentIndentation: number): number => {
  let lineToCheck = originalLine;

  while (lineToCheck > 0) {
    lineToCheck -= 1;
    const lineText = editor.document.lineAt(lineToCheck).text;
    const matches = /^(\s*)(([-+*]|[0-9]+[.)]) +)(\[[ x]\] +)?/.exec(lineText);

    if (matches && matches[1].length <= currentIndentation) {
      return matches[2].length;
    }
  }
  throw "No previous Markdown list item";
};

/**
 * Returns the line number of the next ordered list item
 */
const findNextMarkerLineNumber = (editor: TextEditor, fromLine?: number): number => {
  let lineToCheck = fromLine !== undefined ? fromLine : editor.selection.start.line;

  while (lineToCheck < editor.document.lineCount) {
    const lineText = editor.document.lineAt(lineToCheck).text;
    if (/^\s*[0-9]+[.)] +/.exec(lineText) !== null) {
      return lineToCheck;
    }
    lineToCheck += 1;
  }
  return 0;
};

/**
 * Looks for the previous ordered list marker at the same indentation level
 */
const lookUpwardForMarker = (editor: TextEditor, originalLine: number, currentIndentation: number): number => {
  let lineToCheck = originalLine;

  while (lineToCheck > 0) {
    lineToCheck -= 1;
    const lineText = editor.document.lineAt(lineToCheck).text;
    const matches = /^(\s*)(([0-9]+)[.)] +)/.exec(lineText);

    if (matches) {
      const leadingSpace = matches[1];
      const marker = matches[3];
      if (leadingSpace.length === currentIndentation) {
        return Number(marker) + 1;
      }

      if (
        (!leadingSpace.includes("\t") && leadingSpace.length + matches[2].length <= currentIndentation) ||
        (leadingSpace.includes("\t") && leadingSpace.length + 1 <= currentIndentation)
      ) {
        return 1;
      }
    }

    const nonListMatches = /^(\s*)\S/.exec(lineText);
    if (nonListMatches && nonListMatches[1].length <= currentIndentation) {
      break;
    }
  }
  return 1;
};

/**
 * Fix ordered list marker *iteratively* starting from current line
 */
export const fixMarker = (editor: TextEditor, fromLine?: number): Promise<boolean> => {
  const lineToProcess = fromLine !== undefined ? fromLine : findNextMarkerLineNumber(editor);

  if (lineToProcess < 0 || editor.document.lineCount <= lineToProcess) {
    return Promise.resolve(false);
  }

  const currentLineText = editor.document.lineAt(lineToProcess).text;
  const matches = /^(\s*)([0-9]+)([.)])( +)/.exec(currentLineText);

  if (!matches) {
    return Promise.resolve(false);
  }

  // ordered list
  const leadingSpace = matches[1];
  const marker = matches[2];
  const delimiter = matches[3];
  const trailingSpace = matches[4];
  const fixedMarker = lookUpwardForMarker(editor, lineToProcess, leadingSpace.length);
  const listIndent = marker.length + delimiter.length + trailingSpace.length;
  let fixedMarkerString = String(fixedMarker);

  return editor
    .edit(
      (editBuilder: TextEditorEdit) => {
        if (marker === fixedMarkerString) {
          return;
        }
        // Add enough trailing spaces so that the text is still aligned at the same indentation level as it was previously, but always keep at least one space
        fixedMarkerString += delimiter + " ".repeat(Math.max(1, listIndent - (fixedMarkerString + delimiter).length));

        editBuilder.replace(
          new Range(lineToProcess, leadingSpace.length, lineToProcess, leadingSpace.length + listIndent),
          fixedMarkerString,
        );
      },
      { undoStopBefore: false, undoStopAfter: false },
    )
    .then(() => {
      let nextLine = lineToProcess + 1;
      const indentString = " ".repeat(listIndent);
      while (editor.document.lineCount > nextLine) {
        const nextLineText = editor.document.lineAt(nextLine).text;
        if (/^\s*[0-9]+[.)] +/.test(nextLineText)) {
          return fixMarker(editor, nextLine);
        }
        if (/^\s*$/.test(nextLineText)) {
          nextLine++;
        } else if (listIndent <= 4 && !nextLineText.startsWith(indentString)) {
          return Promise.resolve(false);
        } else {
          nextLine++;
        }
      }
      return Promise.resolve(true);
    });
};

const deleteRange = (editor: TextEditor, range: Range): Thenable<void> => {
  return editor.edit(
    (editBuilder) => {
      editBuilder.delete(range);
    },
    // We will enable undoStop after fixing markers
    { undoStopBefore: true, undoStopAfter: false },
  );
};

export const deactivate = () => {};
