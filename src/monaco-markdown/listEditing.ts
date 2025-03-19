import type { TextEditor, TextEditorEdit } from "./vscode-monaco";

import { isInFencedCodeBlock } from "./util";
import { KeyCode, KeyMod, type Thenable } from "monaco-editor";
import { Position, WorkspaceEdit, Range, Selection, TextEditorRevealType } from "./extHostTypes";
import { addKeybinding } from "./formatting";

function onShiftTabKey(editor: TextEditor) {
  onTabKey(editor, "shift");
}

export function activateListEditing(editor: TextEditor) {
  const editorContext = "editorTextFocus && !editorReadonly && !suggestWidgetVisible";
  addKeybinding(editor, "onEnterKey", onEnterKey, [KeyCode.Enter], "", editorContext, "");
  addKeybinding(editor, "onCtrlEnterKey", onCtrlEnterKey, [KeyCode.Enter | KeyMod.CtrlCmd], "", editorContext, "");
  addKeybinding(editor, "onShiftEnterKey", onShiftEnterKey, [KeyCode.Enter | KeyMod.Shift], "", editorContext, "");
  addKeybinding(editor, "onTabKey", onTabKey, [KeyCode.Tab], "", editorContext, "");
  addKeybinding(editor, "onShiftTabKey", onShiftTabKey, [KeyCode.Tab | KeyMod.Shift], "", editorContext, "");
  addKeybinding(editor, "onBackspaceKey", onBackspaceKey, [KeyCode.Backspace], "", editorContext, "");

  //
  // context.subscriptions.push(
  //     commands.registerCommand('markdown.extension.checkTaskList', checkTaskList),
  //     commands.registerCommand('markdown.extension.onMoveLineDown', onMoveLineDown),
  //     commands.registerCommand('markdown.extension.onMoveLineUp', onMoveLineUp),
  //     commands.registerCommand('markdown.extension.onCopyLineDown', onCopyLineDown),
  //     commands.registerCommand('markdown.extension.onCopyLineUp', onCopyLineUp),
  //     commands.registerCommand('markdown.extension.onIndentLines', onIndentLines),
  //     commands.registerCommand('markdown.extension.onOutdentLines', onOutdentLines)
  // );
}

function onShiftEnterKey(editor: TextEditor) {
  onEnterKey(editor, "shift");
}

function onCtrlEnterKey(editor: TextEditor) {
  onEnterKey(editor, "ctrl");
}

function onEnterKey(editor: TextEditor, modifiers?: string) {
  const cursorPos: Position = editor.selection.active;
  const line = editor.document.lineAt(cursorPos.line);
  const textBeforeCursor = line.text.substr(0, cursorPos.character);
  const textAfterCursor = line.text.substr(cursorPos.character);

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

  let matches: RegExpExecArray;
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

  if (
    // @ts-ignore
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    (matches = /^(\s*[-+*] +(\[[ x]\] +)?)/.exec(textBeforeCursor)) !== null
  ) {
    // Unordered list
    return editor
      .edit((editBuilder: TextEditorEdit) => {
        editBuilder.insert(lineBreakPos, `\n${matches[1].replace("[x]", "[ ]")}`);
      })
      .then(() => {
        // Fix cursor position
        if (modifiers === "ctrl" && !cursorPos.isEqual(lineBreakPos)) {
          const newCursorPos = cursorPos.with(line.lineNumber + 1, matches[1].length);
          editor.selection = new Selection(newCursorPos, newCursorPos);
        }
      })
      .then(() => {
        editor.revealRange(editor.selection, TextEditorRevealType.Default);
      });
  }

  if (
    // @ts-ignore
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    (matches = /^(\s*)([0-9]+)([.)])( +)((\[[ x]\] +)?)/.exec(textBeforeCursor)) !== null
  ) {
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

function onTabKey(editor: TextEditor, modifiers?: string) {
  const cursorPos = editor.selection.start;
  const lineText = editor.document.lineAt(cursorPos.line).text;

  if (isInFencedCodeBlock(editor.document, cursorPos.line)) {
    return asNormal(editor, "tab", modifiers);
  }

  const match = /^\s*([-+*]|[0-9]+[.)]) +(\[[ x]\] +)?/.exec(lineText);
  if (
    match &&
    (modifiers === "shift" ||
      !editor.selection.isEmpty ||
      (editor.selection.isEmpty && cursorPos.character <= match[0].length))
  ) {
    if (modifiers === "shift") {
      return outdent(editor).then(() => fixMarker(editor));
    }
    return indent(editor).then(() => fixMarker(editor));
  }
  return asNormal(editor, "tab", modifiers);
}

function onBackspaceKey(editor: TextEditor) {
  const cursor = editor.selection.active;
  const document = editor.document;
  const textBeforeCursor = document.lineAt(cursor.line).text.substr(0, cursor.character);

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
}

function asNormal(editor: TextEditor, key: string, modifiers?: string): Thenable<void> | undefined {
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
}

/**
 * If
 *
 * 1. it is not the first line
 * 2. there is a Markdown list item before this line
 *
 * then indent the current line to align with the previous list item.
 */
function indent(editor: TextEditor): Thenable<void> {
  const maybeConfig = editor.getConfiguration("markdown.extension.list");
  const config = maybeConfig?.get<string>("indentationSize") || "";
  if (config === "adaptive") {
    try {
      const selection = editor.selection;
      const indentationSize = tryDetermineIndentationSize(
        editor,
        selection.start.line,
        editor.document.lineAt(selection.start.line).firstNonWhitespaceCharacterIndex,
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
}

/**
 * Similar to `indent`-function
 */
function outdent(editor: TextEditor): Thenable<void> {
  const maybeConfig = editor.getConfiguration("markdown.extension.list");
  const config = maybeConfig?.get<string>("indentationSize") || "";

  if (config === "adaptive") {
    try {
      const selection = editor.selection;
      const indentationSize = tryDetermineIndentationSize(
        editor,
        selection.start.line,
        editor.document.lineAt(selection.start.line).firstNonWhitespaceCharacterIndex,
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
}

function tryDetermineIndentationSize(editor: TextEditor, line: number, currentIndentation: number) {
  while (--line >= 0) {
    const lineText = editor.document.lineAt(line).text;
    let matches: RegExpExecArray | null = null;
    if (
      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      (matches = /^(\s*)(([-+*]|[0-9]+[.)]) +)(\[[ x]\] +)?/.exec(lineText)) !== null
    ) {
      if (matches[1].length <= currentIndentation) {
        return matches[2].length;
      }
    }
  }
  throw "No previous Markdown list item";
}

/**
 * Returns the line number of the next ordered list item starting either from
 * the specified line or the beginning of the current selection.
 */
function findNextMarkerLineNumber(editor: TextEditor, line?: number): number {
  if (line === undefined) {
    // Use start.line instead of active.line so that we can find the first
    // marker following either the cursor or the entire selected range
    line = editor.selection.start.line;
  }
  while (line < editor.document.lineCount) {
    const lineText = editor.document.lineAt(line).text;
    if (/^\s*[0-9]+[.)] +/.exec(lineText) !== null) {
      return line;
    }
    line++;
  }
  return 0; // TODO(@unvalley): correct?
}

/**
 * Looks for the previous ordered list marker at the same indentation level
 * and returns the marker number that should follow it.
 *
 * @returns the fixed marker number
 */
function lookUpwardForMarker(editor: TextEditor, line: number, currentIndentation: number): number {
  while (--line >= 0) {
    const lineText = editor.document.lineAt(line).text;
    let matches: RegExpExecArray | null = null;
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    if ((matches = /^(\s*)(([0-9]+)[.)] +)/.exec(lineText)) !== null) {
      const leadingSpace: string = matches[1];
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
    // @ts-ignore
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    if ((matches = /^(\s*)\S/.exec(lineText)) !== null) {
      if (matches[1].length <= currentIndentation) {
        break;
      }
    }
  }
  return 1;
}

/**
 * Fix ordered list marker *iteratively* starting from current line
 */
// @ts-ignore
export function fixMarker(editor: TextEditor, line?: number): Promise<boolean> {
  // if (!workspace.getConfiguration('markdown.extension.orderedList').get<boolean>('autoRenumber')) return;
  // if (workspace.getConfiguration('markdown.extension.orderedList').get<string>('marker') == 'one') return;

  if (line === undefined) {
    // Use either the first line containing an ordered list marker within the selection or the active line
    line = findNextMarkerLineNumber(editor);
    if (line === undefined || line > editor.selection.end.line) {
      line = editor.selection.active.line;
    }
  }
  if (line < 0 || editor.document.lineCount <= line) {
    return Promise.resolve(false);
  }

  const currentLineText = editor.document.lineAt(line).text;
  let matches: RegExpExecArray | null = null;
  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  if ((matches = /^(\s*)([0-9]+)([.)])( +)/.exec(currentLineText)) !== null) {
    // ordered list
    const leadingSpace = matches[1];
    const marker = matches[2];
    const delimiter = matches[3];
    const trailingSpace = matches[4];
    const fixedMarker = lookUpwardForMarker(editor, line, leadingSpace.length);
    const listIndent = marker.length + delimiter.length + trailingSpace.length;
    let fixedMarkerString = String(fixedMarker);

    // @ts-ignore
    return editor
      .edit(
        (editBuilder: TextEditorEdit) => {
          if (marker === fixedMarkerString) {
            return;
          }
          // Add enough trailing spaces so that the text is still aligned at the same indentation level as it was previously, but always keep at least one space
          fixedMarkerString += delimiter + " ".repeat(Math.max(1, listIndent - (fixedMarkerString + delimiter).length));

          editBuilder.replace(
            new Range(line, leadingSpace.length, line, leadingSpace.length + listIndent),
            fixedMarkerString,
          );
        },
        { undoStopBefore: false, undoStopAfter: false },
      )
      .then(() => {
        let nextLine = line + 1;
        const indentString = " ".repeat(listIndent);
        while (editor.document.lineCount > nextLine) {
          const nextLineText = editor.document.lineAt(nextLine).text;
          if (/^\s*[0-9]+[.)] +/.test(nextLineText)) {
            return fixMarker(editor, nextLine);
          }
          if (/^\s*$/.test(nextLineText)) {
            nextLine++;
          } else if (listIndent <= 4 && !nextLineText.startsWith(indentString)) {
            return;
          } else {
            nextLine++;
          }
        }
      });
  }
}

function deleteRange(editor: TextEditor, range: Range): Thenable<void> {
  return editor.edit(
    (editBuilder) => {
      editBuilder.delete(range);
    },
    // We will enable undoStop after fixing markers
    { undoStopBefore: true, undoStopAfter: false },
  );
}

export function deactivate() {}
