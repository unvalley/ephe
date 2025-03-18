import {
  EndOfLine,
  Position,
  Range,
  type Selection,
  TextEditorRevealType,
  type WorkspaceEdit,
} from "./extHostTypes";

import {
  editor,
  type Selection as _Selection,
  type IRange,
  type Uri,
  type Thenable,
} from "monaco-editor";
import { regExpLeadsToEndlessLoop } from "./vscode-utils";
import { ensureValidWordDefinition, getWordAtText } from "./wordHelper";

import * as TypeConverters from "./vscode-converters";
import type { TextLine } from "./vscode-common";

const _modeId2WordDefinition = new Map<string, RegExp>();

export function setWordDefinitionFor(
  modeId: string,
  wordDefinition: RegExp,
): void {
  _modeId2WordDefinition.set(modeId, wordDefinition);
}

export function getWordDefinitionFor(modeId: string): RegExp | undefined {
  return _modeId2WordDefinition.get(modeId);
}

function revealRangeInEditor(
  _editor: editor.ICodeEditor,
  range: IRange,
  revealType: TextEditorRevealType,
): void {
  switch (revealType) {
    case TextEditorRevealType.Default:
    case undefined:
      _editor.revealRange(range, editor.ScrollType.Smooth);
      break;
    case TextEditorRevealType.InCenter:
      _editor.revealRangeInCenter(range, editor.ScrollType.Smooth);
      break;
    case TextEditorRevealType.InCenterIfOutsideViewport:
      _editor.revealRangeInCenterIfOutsideViewport(
        range,
        editor.ScrollType.Smooth,
      );
      break;
    case TextEditorRevealType.AtTop:
      _editor.revealRangeAtTop(range, editor.ScrollType.Smooth);
      break;
    default:
      console.warn(`Unknown revealType: ${revealType}`);
      break;
  }
}

export class TextDocument {
  readonly uri: Uri | undefined;
  readonly version: number | undefined;

  readonly model: editor.ITextModel;

  private _textLines: TextLine[] = [];

  constructor(model: editor.ITextModel) {
    this.model = model;
    this.languageId = getLanguageId(model);
  }

  get eol(): EndOfLine {
    switch (this.model.getEOL()) {
      case "\n": {
        return EndOfLine.LF;
      }
      case "\r\n": {
        return EndOfLine.CRLF;
      }
      default: {
        throw new Error("invalid argument");
      }
    }
  }

  get fileName(): string {
    return "";
  }

  get isClosed(): boolean {
    return false;
  }

  get isDirty(): boolean {
    return false;
  }

  get isUntitled(): boolean {
    return true;
  }

  readonly languageId: string;

  get lineCount(): number {
    return this.model.getLineCount();
  }

  private get _lines(): string[] {
    return this.model.getLinesContent();
  }

  getText(range?: Range): string {
    if (!range) {
      return this.model.getValue();
    }
    return this.model.getValueInRange(TypeConverters.Range.from(range));
  }

  lineAt(lineOrPosition: number | Position): TextLine {
    let line: number | undefined;
    if (lineOrPosition instanceof Position) {
      line = lineOrPosition.line;
    } else if (typeof lineOrPosition === "number") {
      line = lineOrPosition;
    }

    if (typeof line !== "number" || line < 0 || line >= this._lines.length) {
      throw new Error("Illegal value for `line`");
    }

    let result = this._textLines[line];
    if (
      !result ||
      result.lineNumber !== line ||
      result.text !== this._lines[line]
    ) {
      const text = this._lines[line];
      const firstNonWhitespaceCharacterIndex = /^(\s*)/.exec(text)![1].length;
      const range = new Range(line, 0, line, text.length);
      const rangeIncludingLineBreak =
        line < this._lines.length - 1 ? new Range(line, 0, line + 1, 0) : range;

      result = Object.freeze({
        lineNumber: line,
        range,
        rangeIncludingLineBreak,
        text,
        firstNonWhitespaceCharacterIndex, //TODO@api, rename to 'leadingWhitespaceLength'
        isEmptyOrWhitespace: firstNonWhitespaceCharacterIndex === text.length,
      });

      this._textLines[line] = result;
    }

    return result;
  }

  offsetAt(position: Position): number {
    return this.model.getOffsetAt(TypeConverters.Position.from(position));
  }

  positionAt(offset: number): Position {
    return TypeConverters.Position.to(this.model.getPositionAt(offset));
  }

  save(): Thenable<boolean> {
    throw new Error("Not implemented");
  }

  validateRange(range: Range): Range {
    if (!(range instanceof Range)) {
      throw new Error("Invalid argument");
    }

    const start = this.validatePosition(range.start);
    const end = this.validatePosition(range.end);

    if (start === range.start && end === range.end) {
      return range;
    }
    return new Range(start.line, start.character, end.line, end.character);
  }

  validatePosition(position: Position): Position {
    if (!(position instanceof Position)) {
      throw new Error("Invalid argument");
    }

    let { line, character } = position;
    let hasChanged = false;

    if (line < 0) {
      line = 0;
      character = 0;
      hasChanged = true;
    } else if (line >= this._lines.length) {
      line = this._lines.length - 1;
      character = this._lines[line].length;
      hasChanged = true;
    } else {
      const maxCharacter = this._lines[line].length;
      if (character < 0) {
        character = 0;
        hasChanged = true;
      } else if (character > maxCharacter) {
        character = maxCharacter;
        hasChanged = true;
      }
    }

    if (!hasChanged) {
      return position;
    }
    return new Position(line, character);
  }

  getWordRangeAtPosition(
    _position: Position,
    regexp?: RegExp,
  ): Range | undefined {
    const position = this.validatePosition(_position);

    if (!regexp) {
      // use default when custom-regexp isn't provided
      regexp = getWordDefinitionFor(this.languageId);
    } else if (regExpLeadsToEndlessLoop(regexp)) {
      // use default when custom-regexp is bad
      console.warn(
        `[getWordRangeAtPosition]: ignoring custom regexp '${regexp.source}' because it matches the empty string.`,
      );
      regexp = getWordDefinitionFor(this.languageId);
    }

    const wordAtText = getWordAtText(
      position.character + 1,
      ensureValidWordDefinition(regexp),
      this._lines[position.line],
      0,
    );

    if (wordAtText) {
      return new Range(
        position.line,
        wordAtText.startColumn - 1,
        position.line,
        wordAtText.endColumn - 1,
      );
    }
    return undefined;
  }
}

function getLanguageId(model: editor.ITextModel) {
  // @ts-ignore
  return model.getLanguageId();
}

export class TextEditor {
  public readonly editor: editor.IStandaloneCodeEditor;
  private _disposed = false;

  public get languageId(): string {
    const model = this.editor.getModel();
    if (!model) {
      throw new Error("Model is not set");
    }
    return getLanguageId(model);
  }

  constructor(editor: editor.IStandaloneCodeEditor) {
    this.editor = editor;
  }

  get document(): TextDocument {
    const model = this.editor.getModel();
    if (!model) {
      throw new Error("Model is not set");
    }
    return new TextDocument(model);
  }

  get selection(): Selection {
    const selection = this.editor.getSelection();
    if (!selection) {
      throw new Error("Selection is not set");
    }
    return TypeConverters.Selection.to(selection);
  }

  set selection(value: Selection) {
    this.editor.setSelection(TypeConverters.Selection.from(value));
  }

  get selections(): Selection[] {
    const selections = this.editor.getSelections();
    if (!selections) {
      throw new Error("Selections are not set");
    }
    return selections.map((s) => TypeConverters.Selection.to(s));
  }

  set selections(value: Selection[]) {
    this.editor.setSelections(
      value.map((s) => TypeConverters.Selection.from(s)),
    );
  }

  get visibleRanges(): Range[] {
    const visibleRanges = this.editor.getVisibleRanges();
    if (!visibleRanges) {
      throw new Error("Visible ranges are not set");
    }
    return visibleRanges.map((r) => TypeConverters.Range.to(r));
  }

  edit(
    callback: (edit: TextEditorEdit) => void,
    options: { undoStopBefore: boolean; undoStopAfter: boolean } = {
      undoStopBefore: true,
      undoStopAfter: true,
    },
  ): Promise<void> {
    if (this._disposed) {
      return Promise.reject(
        new Error("TextEditor#edit not possible on closed editors"),
      );
    }
    const edit = new TextEditorEdit(this.document, options);
    callback(edit);
    return this._applyEdit(edit);
  }

  private _applyEdit(editBuilder: TextEditorEdit): Promise<void> {
    const editData = editBuilder.finalize();

    // return when there is nothing to do
    if (editData.edits.length === 0 && !editData.setEndOfLine) {
      // @ts-ignore
      return Promise.resolve(null);
    }

    // check that the edits are not overlapping (i.e. illegal)
    const editRanges = editData.edits.map((edit) => edit.range);

    // sort ascending (by end and then by start)
    editRanges.sort((a, b) => {
      if (a.end.line === b.end.line) {
        if (a.end.character === b.end.character) {
          if (a.start.line === b.start.line) {
            return a.start.character - b.start.character;
          }
          return a.start.line - b.start.line;
        }
        return a.end.character - b.end.character;
      }
      return a.end.line - b.end.line;
    });

    // check that no edits are overlapping
    for (let i = 0, count = editRanges.length - 1; i < count; i++) {
      const rangeEnd = editRanges[i].end;
      const nextRangeStart = editRanges[i + 1].start;

      if (nextRangeStart.isBefore(rangeEnd)) {
        // overlapping ranges
        return Promise.reject(new Error("Overlapping ranges are not allowed!"));
      }
    }

    // prepare data for serialization
    const edits = editData.edits.map(
      (edit): editor.IIdentifiedSingleEditOperation => {
        return {
          range: TypeConverters.Range.from(edit.range),
          text: edit.text,
          forceMoveMarkers: edit.forceMoveMarkers,
        };
      },
    );

    const model = this.editor.getModel();
    if (!model) {
      throw new Error("Model is not set");
    }
    model.pushEditOperations(
      this.editor.getSelections(),
      edits,
      (): _Selection[] => {
        return [];
      },
    );

    return Promise.resolve();
  }

  revealRange(range: Range, revealType: TextEditorRevealType): void {
    revealRangeInEditor(
      this.editor,
      TypeConverters.Range.from(range),
      revealType,
    );
  }

  applyEdit(edit: WorkspaceEdit, newSelections?: Selection[]): Thenable<void> {
    const model = this.editor.getModel();
    if (!model) {
      throw new Error("Model is not set");
    }
    model.pushEditOperations(
      this.editor.getSelections(),
      TypeConverters.WorkspaceEdit.from(edit),
      (): _Selection[] => {
        return (
          newSelections?.map((s) => TypeConverters.Selection.from(s)) || []
        );
      },
    );

    // @ts-ignore
    return Promise.resolve(null);
  }

  addAction(descriptor: editor.IActionDescriptor) {
    this.editor.addAction(descriptor);
  }

  // @ts-ignore
  executeCommand(commandId: string, ...rest: any[]): Promise<void> {
    switch (commandId) {
      case "type":
        this.editor.trigger("keyboard", commandId, rest[0]);
        return Promise.resolve();
      case "tab":
      case "deleteLeft":
        this.editor.trigger("keyboard", commandId, undefined);
        return Promise.resolve();
      default: {
        const action = this.editor.getAction(commandId);
        if (action) {
          if (action.isSupported()) {
            return action.run();
          }
        } else {
          new Error(`unknown action id ${commandId}`);
        }
      }
    }
  }

  getConfiguration(configurationId: string) {
    switch (configurationId) {
      case "":
        break;
      default:
        return new UndefinedConfiguration();
    }
  }
}

class UndefinedConfiguration {
  get<T>(_: string): T {
    // @ts-ignore
    return undefined;
  }
}

export interface ITextEditOperation {
  range: Range;
  text: string | null;
  forceMoveMarkers: boolean;
}

export interface IEditData {
  documentVersionId: number | undefined;
  edits: ITextEditOperation[];
  setEndOfLine: EndOfLine | undefined;
  undoStopBefore: boolean;
  undoStopAfter: boolean;
}

export class TextEditorEdit {
  private readonly _document: TextDocument;
  private readonly _documentVersionId: number | undefined;
  private readonly _undoStopBefore: boolean;
  private readonly _undoStopAfter: boolean;
  private _collectedEdits: ITextEditOperation[] = [];
  private _setEndOfLine: EndOfLine | undefined = undefined;
  private _finalized = false;

  constructor(
    document: TextDocument,
    options: { undoStopBefore: boolean; undoStopAfter: boolean },
  ) {
    this._document = document;
    this._documentVersionId = document.version;
    this._undoStopBefore = options.undoStopBefore;
    this._undoStopAfter = options.undoStopAfter;
  }

  finalize(): IEditData {
    this._finalized = true;
    return {
      documentVersionId: this._documentVersionId,
      edits: this._collectedEdits,
      setEndOfLine: this._setEndOfLine,
      undoStopBefore: this._undoStopBefore,
      undoStopAfter: this._undoStopAfter,
    };
  }

  private _throwIfFinalized() {
    if (this._finalized) {
      throw new Error("Edit is only valid while callback runs");
    }
  }

  replace(location: Position | Range | Selection, value: string): void {
    this._throwIfFinalized();
    let range: Range | null = null;

    if (location instanceof Position) {
      range = new Range(location, location);
    } else if (location instanceof Range) {
      range = location;
    } else {
      throw new Error("Unrecognized location");
    }

    this._pushEdit(range, value, false);
  }

  insert(location: Position, value: string): void {
    this._throwIfFinalized();
    this._pushEdit(new Range(location, location), value, true);
  }

  delete(location: Range | Selection): void {
    this._throwIfFinalized();
    let range: Range | null = null;

    if (location instanceof Range) {
      range = location;
    } else {
      throw new Error("Unrecognized location");
    }

    this._pushEdit(range, null, true);
  }

  private _pushEdit(
    range: Range,
    text: string | null,
    forceMoveMarkers: boolean,
  ): void {
    const validRange = this._document.validateRange(range);
    this._collectedEdits.push({
      range: validRange,
      text: text,
      forceMoveMarkers: forceMoveMarkers,
    });
  }

  setEndOfLine(endOfLine: EndOfLine): void {
    this._throwIfFinalized();
    if (endOfLine !== EndOfLine.LF && endOfLine !== EndOfLine.CRLF) {
      throw new Error("Illegal argument endOfLine");
    }

    this._setEndOfLine = endOfLine;
  }
}
