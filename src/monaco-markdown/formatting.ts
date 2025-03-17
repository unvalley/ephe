import { editor, KeyCode, KeyMod } from "monaco-editor";

import { fixMarker } from "./listEditing";
import type { TextDocument, TextEditor } from "./vscode-monaco";
import { Position, Selection, Range, WorkspaceEdit } from "./extHostTypes";

export function addKeybinding(
  editor: TextEditor,
  name: string,
  fun: CallableFunction,
  keybindings: number[],
  label: string,
  context: string,
  contextMenuGroupId = "markdown.extension.editing",
) {
  editor.addAction({
    contextMenuGroupId,
    contextMenuOrder: 0,
    id: `markdown.extension.editing.${name}`,
    keybindingContext: context,
    keybindings,
    label,
    precondition: "",
    run(_: editor.ICodeEditor): void | Promise<void> {
      fun(editor);
      return undefined;
    },
  });
}

export function activateFormatting(editor: TextEditor) {
  addKeybinding(
    editor,
    "toggleBold",
    toggleBold,
    [KeyMod.CtrlCmd | KeyCode.KeyB],
    "Toggle bold",
    "",
  );
  addKeybinding(
    editor,
    "toggleItalic",
    toggleItalic,
    [KeyMod.CtrlCmd | KeyCode.KeyI],
    "Toggle italic",
    "",
  );
  addKeybinding(
    editor,
    "toggleCodeSpan",
    toggleCodeSpan,
    [KeyMod.CtrlCmd | KeyCode.Backquote],
    "Toggle code span",
    "",
  );
  addKeybinding(
    editor,
    "toggleStrikethrough",
    toggleStrikethrough,
    [KeyMod.Alt | KeyCode.KeyS],
    "Toggle strikethrough",
    "",
  );
  addKeybinding(
    editor,
    "toggleMath",
    toggleMath,
    [KeyMod.CtrlCmd | KeyCode.KeyM],
    "Toggle math",
    "",
  );
  addKeybinding(
    editor,
    "toggleMathReverse",
    toggleMathReverse,
    [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyM],
    "Toggle math reverse",
    "",
  );
  addKeybinding(
    editor,
    "toggleHeadingUp",
    toggleHeadingUp,
    [KeyMod.WinCtrl | KeyMod.Shift | KeyCode.BracketLeft],
    "Heading up",
    "",
  );
  addKeybinding(
    editor,
    "toggleHeadingDown",
    toggleHeadingDown,
    [KeyMod.WinCtrl | KeyMod.Shift | KeyCode.BracketRight],
    "Heading down",
    "",
  );
  addKeybinding(
    editor,
    "toggleList",
    toggleList,
    [KeyMod.CtrlCmd | KeyCode.KeyL],
    "Toggle list",
    "",
  );
  // addKeybinding(editor, paste, [KeyMod.CtrlCmd | KeyCode.KEY_B], "Toggle bold");
}

/**
 * Here we store Regexp to check if the text is the single link.
 */
const singleLinkRegex: RegExp = createLinkRegex();

// Return Promise because need to chain operations in unit tests

function toggleBold(editor: TextEditor) {
  return styleByWrapping(editor, "**");
}

function toggleItalic(editor: TextEditor) {
  // let indicator = workspace.getConfiguration('markdown.extension.italic').get<string>('indicator');
  return styleByWrapping(editor, "*");
}

function toggleCodeSpan(editor: TextEditor) {
  return styleByWrapping(editor, "`");
}

function toggleStrikethrough(editor: TextEditor) {
  return styleByWrapping(editor, "~~");
}

const maxHeading = "######";

function toggleHeadingUp(editor: TextEditor) {
  const lineIndex = editor.selection.active.line;
  const lineText = editor.document.lineAt(lineIndex).text;

  return editor.edit((editBuilder) => {
    if (!lineText.startsWith("#")) {
      // Not a heading
      editBuilder.insert(new Position(lineIndex, 0), "# ");
    } else if (lineText.startsWith(maxHeading)) {
      // Reset heading at 6 level
      const deleteIndex = lineText.startsWith(`${maxHeading} `)
        ? maxHeading.length + 1
        : maxHeading.length;
      editBuilder.delete(
        new Range(
          new Position(lineIndex, 0),
          new Position(lineIndex, deleteIndex),
        ),
      );
    } else {
      editBuilder.insert(new Position(lineIndex, 0), "#");
    }
  });
}

function toggleHeadingDown(editor: TextEditor) {
  const lineIndex = editor.selection.active.line;
  const lineText = editor.document.lineAt(lineIndex).text;

  editor.edit((editBuilder) => {
    if (lineText.startsWith("# ")) {
      // Heading level 1
      editBuilder.delete(
        new Range(new Position(lineIndex, 0), new Position(lineIndex, 2)),
      );
    } else if (lineText.startsWith("#")) {
      // Heading (but not level 1)
      editBuilder.delete(
        new Range(new Position(lineIndex, 0), new Position(lineIndex, 1)),
      );
    } else {
      // No heading
      editBuilder.insert(new Position(lineIndex, 0), `${maxHeading} `);
    }
  });
}

enum MathBlockState {
  // State 1: not in any others states
  NONE = 0,
  // State 2: $|$
  INLINE = 1,
  // State 3: $$ | $$
  SINGLE_DISPLAYED = 2,
  // State 4:
  // $$
  // |
  // $$
  MULTI_DISPLAYED = 3,
}

function getMathState(editor: TextEditor, cursor: Position): MathBlockState {
  if (getContext(editor, cursor, "$") === "$|$") {
    return MathBlockState.INLINE;
  }
  if (getContext(editor, cursor, "$$ ", " $$") === "$$ | $$") {
    return MathBlockState.SINGLE_DISPLAYED;
  }
  if (
    editor.document.lineAt(cursor.line).text === "" &&
    cursor.line > 0 &&
    editor.document.lineAt(cursor.line - 1).text === "$$" &&
    cursor.line < editor.document.lineCount - 1 &&
    editor.document.lineAt(cursor.line + 1).text === "$$"
  ) {
    return MathBlockState.MULTI_DISPLAYED;
  }
  return MathBlockState.NONE;
}

/**
 * Modify the document, change from `oldMathBlockState` to `newMathBlockState`.
 * @param editor
 * @param cursor
 * @param oldMathBlockState
 * @param newMathBlockState
 */
function setMathState(
  editor: TextEditor,
  cursor: Position,
  oldMathBlockState: MathBlockState,
  newMathBlockState: MathBlockState,
) {
  // Step 1: Delete old math block.
  editor
    .edit((editBuilder) => {
      let rangeToBeDeleted: Range;
      switch (oldMathBlockState) {
        case MathBlockState.NONE:
          rangeToBeDeleted = new Range(cursor, cursor);
          break;
        case MathBlockState.INLINE:
          rangeToBeDeleted = new Range(
            new Position(cursor.line, cursor.character - 1),
            new Position(cursor.line, cursor.character + 1),
          );
          break;
        case MathBlockState.SINGLE_DISPLAYED:
          rangeToBeDeleted = new Range(
            new Position(cursor.line, cursor.character - 3),
            new Position(cursor.line, cursor.character + 3),
          );
          break;
        case MathBlockState.MULTI_DISPLAYED:
          rangeToBeDeleted = new Range(
            new Position(cursor.line - 1, 0),
            new Position(cursor.line + 1, 2),
          );
          break;
      }
      editBuilder.delete(rangeToBeDeleted);
    })
    .then(() => {
      // Step 2: Insert new math block.
      editor
        .edit((editBuilder) => {
          const newCursor = editor.selection.active;
          let stringToBeInserted: string;
          switch (newMathBlockState) {
            case MathBlockState.NONE:
              stringToBeInserted = "";
              break;
            case MathBlockState.INLINE:
              stringToBeInserted = "$$";
              break;
            case MathBlockState.SINGLE_DISPLAYED:
              stringToBeInserted = "$$  $$";
              break;
            case MathBlockState.MULTI_DISPLAYED:
              stringToBeInserted = "$$\n\n$$";
              break;
          }
          editBuilder.insert(newCursor, stringToBeInserted);
        })
        .then(() => {
          // Step 3: Move cursor to the middle.
          const newCursor = editor.selection.active;
          let newPosition: Position;
          switch (newMathBlockState) {
            case MathBlockState.NONE:
              newPosition = newCursor;
              break;
            case MathBlockState.INLINE:
              newPosition = newCursor.with(
                newCursor.line,
                newCursor.character - 1,
              );
              break;
            case MathBlockState.SINGLE_DISPLAYED:
              newPosition = newCursor.with(
                newCursor.line,
                newCursor.character - 3,
              );
              break;
            case MathBlockState.MULTI_DISPLAYED:
              newPosition = newCursor.with(newCursor.line - 1, 0);
              break;
          }
          editor.selection = new Selection(newPosition, newPosition);
        });
    });
}

const transTable = [
  MathBlockState.NONE,
  MathBlockState.INLINE,
  MathBlockState.MULTI_DISPLAYED,
  MathBlockState.SINGLE_DISPLAYED,
];

const reverseTransTable = new Array(...transTable).reverse();

function toggleMath(editor: TextEditor) {
  _toggleMath(editor, transTable);
}

function toggleMathReverse(editor: TextEditor) {
  _toggleMath(editor, reverseTransTable);
}

function _toggleMath(editor: TextEditor, transTable: MathBlockState[]) {
  if (!editor.selection.isEmpty) return;
  const cursor = editor.selection.active;

  const oldMathBlockState = getMathState(editor, cursor);
  const currentStateIndex = transTable.indexOf(oldMathBlockState);
  setMathState(
    editor,
    cursor,
    oldMathBlockState,
    transTable[(currentStateIndex + 1) % transTable.length],
  );
}

function toggleList(editor: TextEditor) {
  const doc = editor.document;
  const batchEdit = new WorkspaceEdit();

  for (const selection of editor.selections) {
    if (selection.isEmpty) {
      toggleListSingleLine(doc, selection.active.line, batchEdit);
    } else {
      for (let i = selection.start.line; i <= selection.end.line; i++) {
        toggleListSingleLine(doc, i, batchEdit);
      }
    }
  }

  return editor.applyEdit(batchEdit, []).then(() => fixMarker(editor));
}

function toggleListSingleLine(
  doc: TextDocument,
  line: number,
  wsEdit: WorkspaceEdit,
) {
  const lineText = doc.lineAt(line).text;
  const indentation =
    lineText.trim().length === 0
      ? lineText.length
      : lineText.indexOf(lineText.trim());
  const lineTextContent = lineText.substr(indentation);

  if (lineTextContent.startsWith("- ")) {
    wsEdit.replace(
      doc.uri,
      new Range(line, indentation, line, indentation + 2),
      "* ",
    );
  } else if (lineTextContent.startsWith("* ")) {
    wsEdit.replace(
      doc.uri,
      new Range(line, indentation, line, indentation + 2),
      "+ ",
    );
  } else if (lineTextContent.startsWith("+ ")) {
    wsEdit.replace(
      doc.uri,
      new Range(line, indentation, line, indentation + 2),
      "1. ",
    );
  } else if (/^\d\. /.test(lineTextContent)) {
    wsEdit.replace(
      doc.uri,
      new Range(line, indentation + 1, line, indentation + 2),
      ")",
    );
  } else if (/^\d\) /.test(lineTextContent)) {
    wsEdit.delete(doc.uri, new Range(line, indentation, line, indentation + 3));
  } else {
    wsEdit.insert(doc.uri, new Position(line, indentation), "- ");
  }
}

/**
 * Creates Regexp to check if the text is a link (further detailes in the isSingleLink() documentation).
 *
 * @return Regexp
 */
function createLinkRegex(): RegExp {
  // unicode letters range(must not be a raw string)
  const ul = "\\u00a1-\\uffff";
  // IP patterns
  const ipv4_re =
    "(?:25[0-5]|2[0-4]\\d|[0-1]?\\d?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|[0-1]?\\d?\\d)){3}";
  const ipv6_re = "\\[[0-9a-f:\\.]+\\]"; // simple regex (in django it is validated additionally)

  // Host patterns
  const hostname_re =
    `[a-z${ul}0-9](?:[a-z${ul}0-9-]{0,61}[a-z${ul}0-9])?`;
  // Max length for domain name labels is 63 characters per RFC 1034 sec. 3.1
  const domain_re = `(?:\\.(?!-)[a-z${ul}0-9-]{1,63})*`;

  const tld_re =
    `\\.` + // dot
    `(?!-)` + // can't start with a dash
    `(?:[a-z${ul}-]{2,63}` + // domain label
    `|xn--[a-z0-9]{1,59})` + // or punycode label
    // + '(?<!-)'                            // can't end with a dash
    `\\.?`; // may have a trailing dot

  const host_re = `(${hostname_re}${domain_re}${tld_re}|localhost)`;
  const pattern =
    `^(?:[a-z0-9\\.\\-\\+]*)://` + // scheme is not validated (in django it is validated additionally)
    `(?:[^\\s:@/]+(?::[^\\s:@/]*)?@)?` + // user: pass authentication
    `(?:${ipv4_re}|${ipv6_re}|${host_re})` +
    `(?::\\d{2,5})?` + // port
    `(?:[/?#][^\\s]*)?` + // resource path
    `$`; // end of string

  return new RegExp(pattern, "i");
}

/**
 * Checks if the string is a link. The list of link examples you can see in the tests file
 * `test/linksRecognition.test.ts`. This code ported from django's
 * [URLValidator](https://github.com/django/django/blob/2.2b1/django/core/validators.py#L74) with some simplifyings.
 *
 * @param text string to check
 *
 * @return boolean
 */
export function isSingleLink(text: string): boolean {
  return singleLinkRegex.test(text);
}

function styleByWrapping(
  editor: TextEditor,
  startPattern: string,
  endPattern?: string,
) {
  const actualEndPattern = endPattern === undefined ? startPattern : endPattern;

  const selections = editor.selections;

  const batchEdit = new WorkspaceEdit();
  const shifts: [Position, number][] = [];
  const newSelections: Selection[] = selections.slice();

  selections.forEach((selection, i) => {
    const cursorPos = selection.active;
    const shift = shifts
      .map(([pos, s]) =>
        selection.start.line === pos.line &&
        selection.start.character >= pos.character
          ? s
          : 0,
      )
      .reduce((a, b) => a + b, 0);

    if (selection.isEmpty) {
      // No selected text
      if (
        startPattern !== "~~" &&
        getContext(editor, cursorPos, startPattern) ===
          `${startPattern}text|${actualEndPattern}`
      ) {
        // `**text|**` to `**text**|`
        const newCursorPos = cursorPos.with({
          character: cursorPos.character + shift + actualEndPattern.length,
        });
        newSelections[i] = new Selection(newCursorPos, newCursorPos);
        return;
      }
      if (
        getContext(editor, cursorPos, startPattern) ===
        `${startPattern}|${actualEndPattern}`
      ) {
        // `**|**` to `|`
        const start = cursorPos.with({
          character: cursorPos.character - startPattern.length,
        });
        const end = cursorPos.with({
          character: cursorPos.character + actualEndPattern.length,
        });
        wrapRange(
          editor,
          batchEdit,
          shifts,
          newSelections,
          i,
          shift,
          cursorPos,
          new Range(start, end),
          false,
          startPattern,
        );
      } else {
        // Select word under cursor
        let wordRange = editor.document.getWordRangeAtPosition(cursorPos);
        if (wordRange === undefined) {
          wordRange = selection;
        }
        // One special case: toggle strikethrough in task list
        const currentTextLine = editor.document.lineAt(cursorPos.line);
        if (
          startPattern === "~~" &&
          /^\s*[\*\+\-] (\[[ x]\] )? */g.test(currentTextLine.text)
        ) {
          const match = currentTextLine.text.match(/^\s*[\*\+\-] (\[[ x]\] )? */g);
          if (match?.[0]) {
            wordRange = currentTextLine.range.with(
              new Position(
                cursorPos.line,
                match[0].length,
              ),
            );
          }
        }

        wrapRange(
          editor,
          batchEdit,
          shifts,
          newSelections,
          i,
          shift,
          cursorPos,
          wordRange,
          false,
          startPattern,
        );
      }
    } else {
      // Text selected
      wrapRange(
        editor,
        batchEdit,
        shifts,
        newSelections,
        i,
        shift,
        cursorPos,
        selection,
        true,
        startPattern,
      );
    }
  });

  const hasSelection = editor.selection && !editor.selection.isEmpty;

  return editor.applyEdit(batchEdit, newSelections).then(() => {
    if (!hasSelection) {
      editor.selections = newSelections;
    }
  });
}

/**
 * Add or remove `startPattern`/`endPattern` according to the context
 * @param editor
 * @param options The undo/redo behavior
 * @param cursor cursor position
 * @param range range to be replaced
 * @param isSelected is this range selected
 * @param startPtn
 * @param endPtn
 */
function wrapRange(
  editor: TextEditor,
  wsEdit: WorkspaceEdit,
  shifts: [Position, number][],
  newSelections: Selection[],
  i: number,
  shift: number,
  cursor: Position,
  range: Range,
  isSelected: boolean,
  startPtn: string,
  endPtn?: string,
) {
  const actualEndPtn = endPtn === undefined ? startPtn : endPtn;

  const text = editor.document.getText(range);
  const prevSelection = newSelections[i];
  const ptnLength = (startPtn + actualEndPtn).length;

  let newCursorPos = cursor.with({ character: cursor.character + shift });
  let newSelection: Selection;
  if (isWrapped(text, startPtn)) {
    // remove start/end patterns from range
    wsEdit.replace(
      editor.document.uri,
      range,
      text.substr(startPtn.length, text.length - ptnLength),
    );

    shifts.push([range.end, -ptnLength]);

    // Fix cursor position
    if (!isSelected) {
      if (!range.isEmpty) {
        // means quick styling
        if (cursor.character === range.end.character) {
          newCursorPos = cursor.with({
            character: cursor.character + shift - ptnLength,
          });
        } else {
          newCursorPos = cursor.with({
            character: cursor.character + shift - startPtn.length,
          });
        }
      } else {
        // means `**|**` -> `|`
        newCursorPos = cursor.with({
          character: cursor.character + shift + startPtn.length,
        });
      }
      newSelection = new Selection(newCursorPos, newCursorPos);
    } else {
      newSelection = new Selection(
        prevSelection.start.with({
          character: prevSelection.start.character + shift,
        }),
        prevSelection.end.with({
          character: prevSelection.end.character + shift - ptnLength,
        }),
      );
    }
  } else {
    // add start/end patterns around range
    wsEdit.replace(editor.document.uri, range, startPtn + text + actualEndPtn);

    shifts.push([range.end, ptnLength]);

    // Fix cursor position
    if (!isSelected) {
      if (!range.isEmpty) {
        // means quick styling
        if (cursor.character === range.end.character) {
          newCursorPos = cursor.with({
            character: cursor.character + shift + ptnLength,
          });
        } else {
          newCursorPos = cursor.with({
            character: cursor.character + shift + startPtn.length,
          });
        }
      } else {
        // means `|` -> `**|**`
        newCursorPos = cursor.with({
          character: cursor.character + shift + startPtn.length,
        });
      }
      newSelection = new Selection(newCursorPos, newCursorPos);
    } else {
      newSelection = new Selection(
        prevSelection.start.with({
          character: prevSelection.start.character + shift,
        }),
        prevSelection.end.with({
          character: prevSelection.end.character + shift + ptnLength,
        }),
      );
    }
  }

  newSelections[i] = newSelection;
}

function isWrapped(
  text: string,
  startPattern: string,
  endPattern?: string,
): boolean {
  const actualEndPattern = endPattern === undefined ? startPattern : endPattern;
  return text.startsWith(startPattern) && text.endsWith(actualEndPattern);
}

function getContext(
  editor: TextEditor,
  cursorPos: Position,
  startPattern: string,
  endPattern?: string,
): string {
  const actualEndPattern = endPattern === undefined ? startPattern : endPattern;

  let startPositionCharacter = cursorPos.character - startPattern.length;
  const endPositionCharacter = cursorPos.character + actualEndPattern.length;

  if (startPositionCharacter < 0) {
    startPositionCharacter = 0;
  }

  const leftText = editor.document.getText(
    new Range(
      cursorPos.line,
      startPositionCharacter,
      cursorPos.line,
      cursorPos.character,
    ),
  );
  const rightText = editor.document.getText(
    new Range(
      cursorPos.line,
      cursorPos.character,
      cursorPos.line,
      endPositionCharacter,
    ),
  );

  if (rightText === actualEndPattern) {
    if (leftText === startPattern) {
      return `${startPattern}|${actualEndPattern}`;
    }
    return `${startPattern}text|${actualEndPattern}`;
  }
  return "|";
}
