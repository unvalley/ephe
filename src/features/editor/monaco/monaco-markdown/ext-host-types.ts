import { illegalArgument } from "./errors";
import type { Uri } from "monaco-editor";

// export function values<V = any>(set: Set<V>): V[];
// export function values<K = any, V = any>(map: Map<K, V>): V[];
export function values<V>(forEachable: { forEach(callback: (value: V, ...more: any[]) => any): void }): V[] {
  const result: V[] = [];
  forEachable.forEach((value) => result.push(value));
  return result;
}

export class Position {
  static Min(...positions: Position[]): Position {
    if (positions.length === 0) {
      throw new TypeError();
    }
    let result = positions[0];
    for (let i = 1; i < positions.length; i++) {
      const p = positions[i];
      if (p.isBefore(result!)) {
        result = p;
      }
    }
    return result;
  }

  static Max(...positions: Position[]): Position {
    if (positions.length === 0) {
      throw new TypeError();
    }
    let result = positions[0];
    for (let i = 1; i < positions.length; i++) {
      const p = positions[i];
      if (p.isAfter(result!)) {
        result = p;
      }
    }
    return result;
  }

  static isPosition(other: any): other is Position {
    if (!other) {
      return false;
    }
    if (other instanceof Position) {
      return true;
    }
    const { line, character } = <Position>other;
    if (typeof line === "number" && typeof character === "number") {
      return true;
    }
    return false;
  }

  private _line: number;
  private _character: number;

  get line(): number {
    return this._line;
  }

  get character(): number {
    return this._character;
  }

  constructor(line: number, character: number) {
    if (line < 0) {
      throw illegalArgument("line must be non-negative");
    }
    if (character < 0) {
      throw illegalArgument("character must be non-negative");
    }
    this._line = line;
    this._character = character;
  }

  isBefore(other: Position): boolean {
    if (this._line < other._line) {
      return true;
    }
    if (other._line < this._line) {
      return false;
    }
    return this._character < other._character;
  }

  isBeforeOrEqual(other: Position): boolean {
    if (this._line < other._line) {
      return true;
    }
    if (other._line < this._line) {
      return false;
    }
    return this._character <= other._character;
  }

  isAfter(other: Position): boolean {
    return !this.isBeforeOrEqual(other);
  }

  isAfterOrEqual(other: Position): boolean {
    return !this.isBefore(other);
  }

  isEqual(other: Position): boolean {
    return this._line === other._line && this._character === other._character;
  }

  compareTo(other: Position): number {
    if (this._line < other._line) {
      return -1;
    }
    if (this._line > other.line) {
      return 1;
    }
    // equal line
    if (this._character < other._character) {
      return -1;
    }
    if (this._character > other._character) {
      return 1;
    }
    // equal line and character
    return 0;
  }

  translate(change: { lineDelta?: number; characterDelta?: number }): Position;
  translate(lineDelta?: number, characterDelta?: number): Position;
  translate(
    lineDeltaOrChange: number | undefined | { lineDelta?: number; characterDelta?: number },
    characterDelta = 0,
  ): Position {
    if (lineDeltaOrChange === null || characterDelta === null) {
      throw illegalArgument();
    }

    let lineDelta: number;
    if (typeof lineDeltaOrChange === "undefined") {
      lineDelta = 0;
    } else if (typeof lineDeltaOrChange === "number") {
      lineDelta = lineDeltaOrChange;
    } else {
      lineDelta = typeof lineDeltaOrChange.lineDelta === "number" ? lineDeltaOrChange.lineDelta : 0;
      characterDelta = typeof lineDeltaOrChange.characterDelta === "number" ? lineDeltaOrChange.characterDelta : 0;
    }

    if (lineDelta === 0 && characterDelta === 0) {
      return this;
    }
    return new Position(this.line + lineDelta, this.character + characterDelta);
  }

  with(change: { line?: number; character?: number }): Position;
  with(line?: number, character?: number): Position;
  with(
    lineOrChange: number | undefined | { line?: number; character?: number },
    character: number = this.character,
  ): Position {
    if (lineOrChange === null || character === null) {
      throw illegalArgument();
    }

    let line: number;
    if (typeof lineOrChange === "undefined") {
      line = this.line;
    } else if (typeof lineOrChange === "number") {
      line = lineOrChange;
    } else {
      line = typeof lineOrChange.line === "number" ? lineOrChange.line : this.line;
      character = typeof lineOrChange.character === "number" ? lineOrChange.character : this.character;
    }

    if (line === this.line && character === this.character) {
      return this;
    }
    return new Position(line, character);
  }

  toJSON(): any {
    return { line: this.line, character: this.character };
  }
}

export class Range {
  static isRange(thing: any): boolean {
    if (thing instanceof Range) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return Position.isPosition((<Range>thing).start) && Position.isPosition(<Range>thing.end);
  }

  protected _start: Position;
  protected _end: Position;

  get start(): Position {
    return this._start;
  }

  get end(): Position {
    return this._end;
  }

  constructor(start: Position, end: Position);
  constructor(startLine: number, startColumn: number, endLine: number, endColumn: number);
  constructor(
    startLineOrStart: number | Position,
    startColumnOrEnd: number | Position,
    endLine?: number,
    endColumn?: number,
  ) {
    let start: Position | undefined;
    let end: Position | undefined;

    if (
      typeof startLineOrStart === "number" &&
      typeof startColumnOrEnd === "number" &&
      typeof endLine === "number" &&
      typeof endColumn === "number"
    ) {
      start = new Position(startLineOrStart, startColumnOrEnd);
      end = new Position(endLine, endColumn);
    } else if (startLineOrStart instanceof Position && startColumnOrEnd instanceof Position) {
      start = startLineOrStart;
      end = startColumnOrEnd;
    }

    if (!start || !end) {
      throw new Error("Invalid arguments");
    }

    if (start.isBefore(end)) {
      this._start = start;
      this._end = end;
    } else {
      this._start = end;
      this._end = start;
    }
  }

  contains(positionOrRange: Position | Range): boolean {
    if (positionOrRange instanceof Range) {
      return this.contains(positionOrRange._start) && this.contains(positionOrRange._end);
    }
    if (positionOrRange instanceof Position) {
      if (positionOrRange.isBefore(this._start)) {
        return false;
      }
      if (this._end.isBefore(positionOrRange)) {
        return false;
      }
      return true;
    }
    return false;
  }

  isEqual(other: Range): boolean {
    return this._start.isEqual(other._start) && this._end.isEqual(other._end);
  }

  intersection(other: Range): Range | undefined {
    const start = Position.Max(other.start, this._start);
    const end = Position.Min(other.end, this._end);
    if (start.isAfter(end)) {
      // this happens when there is no overlap:
      // |-----|
      //          |----|
      return undefined;
    }
    return new Range(start, end);
  }

  union(other: Range): Range {
    if (this.contains(other)) {
      return this;
    }
    if (other.contains(this)) {
      return other;
    }
    const start = Position.Min(other.start, this._start);
    const end = Position.Max(other.end, this.end);
    return new Range(start, end);
  }

  get isEmpty(): boolean {
    return this._start.isEqual(this._end);
  }

  get isSingleLine(): boolean {
    return this._start.line === this._end.line;
  }

  with(change: { start?: Position; end?: Position }): Range;
  with(start?: Position, end?: Position): Range;
  with(startOrChange: Position | undefined | { start?: Position; end?: Position }, end: Position = this.end): Range {
    if (startOrChange === null || end === null) {
      throw illegalArgument();
    }

    let start: Position;
    if (!startOrChange) {
      start = this.start;
    } else if (Position.isPosition(startOrChange)) {
      start = startOrChange;
    } else {
      start = startOrChange.start || this.start;
      end = startOrChange.end || this.end;
    }

    if (start.isEqual(this._start) && end.isEqual(this.end)) {
      return this;
    }
    return new Range(start, end);
  }

  toJSON(): any {
    return [this.start, this.end];
  }
}

export class Selection extends Range {
  static isSelection(thing: any): thing is Selection {
    if (thing instanceof Selection) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return (
      Range.isRange(thing) &&
      Position.isPosition((<Selection>thing).anchor) &&
      Position.isPosition((<Selection>thing).active) &&
      typeof (<Selection>thing).isReversed === "boolean"
    );
  }

  private _anchor: Position;

  public get anchor(): Position {
    return this._anchor;
  }

  private _active: Position;

  public get active(): Position {
    return this._active;
  }

  constructor(anchor: Position, active: Position);
  constructor(anchorLine: number, anchorColumn: number, activeLine: number, activeColumn: number);
  constructor(
    anchorLineOrAnchor: number | Position,
    anchorColumnOrActive: number | Position,
    activeLine?: number,
    activeColumn?: number,
  ) {
    let anchor: Position | undefined;
    let active: Position | undefined;

    if (
      typeof anchorLineOrAnchor === "number" &&
      typeof anchorColumnOrActive === "number" &&
      typeof activeLine === "number" &&
      typeof activeColumn === "number"
    ) {
      anchor = new Position(anchorLineOrAnchor, anchorColumnOrActive);
      active = new Position(activeLine, activeColumn);
    } else if (anchorLineOrAnchor instanceof Position && anchorColumnOrActive instanceof Position) {
      anchor = anchorLineOrAnchor;
      active = anchorColumnOrActive;
    }

    if (!anchor || !active) {
      throw new Error("Invalid arguments");
    }

    super(anchor, active);

    this._anchor = anchor;
    this._active = active;
  }

  get isReversed(): boolean {
    return this._anchor === this._end;
  }

  toJSON() {
    return {
      start: this.start,
      end: this.end,
      active: this.active,
      anchor: this.anchor,
    };
  }
}

export enum EndOfLine {
  LF = 1,
  CRLF = 2,
}

export class TextEdit {
  static isTextEdit(thing: any): thing is TextEdit {
    if (thing instanceof TextEdit) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return Range.isRange(<TextEdit>thing) && typeof (<TextEdit>thing).newText === "string";
  }

  static replace(range: Range, newText: string): TextEdit {
    return new TextEdit(range, newText);
  }

  static insert(position: Position, newText: string): TextEdit {
    return TextEdit.replace(new Range(position, position), newText);
  }

  static delete(range: Range): TextEdit {
    return TextEdit.replace(range, "");
  }

  static setEndOfLine(eol: EndOfLine): TextEdit {
    const ret = new TextEdit(new Range(new Position(0, 0), new Position(0, 0)), "");
    ret.newEol = eol;
    return ret;
  }

  protected _range: Range | undefined;
  protected _newText: string | null;
  protected _newEol: EndOfLine = EndOfLine.LF;

  get range(): Range | undefined {
    return this._range;
  }

  set range(value: Range) {
    if (value && !Range.isRange(value)) {
      throw illegalArgument("range");
    }
    this._range = value;
  }

  get newText(): string {
    return this._newText || "";
  }

  set newText(value: string) {
    if (value && typeof value !== "string") {
      throw illegalArgument("newText");
    }
    this._newText = value;
  }

  get newEol(): EndOfLine {
    return this._newEol;
  }

  set newEol(value: EndOfLine) {
    if (value && typeof value !== "number") {
      throw illegalArgument("newEol");
    }
    this._newEol = value;
  }

  constructor(range: Range, newText: string | null) {
    this.range = range;
    this._newText = newText;
  }

  toJSON(): any {
    return {
      range: this.range,
      newText: this.newText,
      newEol: this._newEol,
    };
  }
}

export type IFileOperationOptions = {
  overwrite?: boolean;
  ignoreIfExists?: boolean;
  ignoreIfNotExists?: boolean;
  recursive?: boolean;
};

export type IFileOperation = {
  _type: 1;
  from?: Uri;
  to?: Uri;
  options?: IFileOperationOptions;
};

export type IFileTextEdit = {
  _type: 2;
  uri: Uri;
  edit: TextEdit;
};

export class WorkspaceEdit {
  private _edits = new Array<IFileOperation | IFileTextEdit>();

  renameFile(from: Uri, to: Uri, options?: { overwrite?: boolean; ignoreIfExists?: boolean }): void {
    this._edits.push({ _type: 1, from, to, options });
  }

  createFile(uri: Uri, options?: { overwrite?: boolean; ignoreIfExists?: boolean }): void {
    this._edits.push({ _type: 1, from: undefined, to: uri, options });
  }

  deleteFile(uri: Uri, options?: { recursive?: boolean; ignoreIfNotExists?: boolean }): void {
    this._edits.push({ _type: 1, from: uri, to: undefined, options });
  }

  replace(uri: Uri, range: Range, newText: string): void {
    this._edits.push({ _type: 2, uri, edit: new TextEdit(range, newText) });
  }

  insert(resource: Uri, position: Position, newText: string): void {
    this.replace(resource, new Range(position, position), newText);
  }

  delete(resource: Uri, range: Range): void {
    this.replace(resource, range, "");
  }

  has(uri: Uri): boolean {
    for (const edit of this._edits) {
      if (edit._type === 2 && edit.uri.toString() === uri.toString()) {
        return true;
      }
    }
    return false;
  }

  set(uri: Uri, edits: TextEdit[]): void {
    if (!edits) {
      // remove all text edits for `uri`
      for (let i = 0; i < this._edits.length; i++) {
        const element = this._edits[i];
        if (element._type === 2 && element.uri.toString() === uri.toString()) {
          this._edits[i] = undefined!; // will be coalesced down below
        }
      }
      // this._edits = coalesce(this._edits); TODO
    } else {
      // append edit to the end
      for (const edit of edits) {
        if (edit) {
          this._edits.push({ _type: 2, uri, edit });
        }
      }
    }
  }

  get(uri: Uri): TextEdit[] {
    const res: TextEdit[] = [];
    for (const candidate of this._edits) {
      if (candidate._type === 2 && candidate.uri.toString() === uri.toString()) {
        res.push(candidate.edit);
      }
    }
    return res;
  }

  entries(): [Uri, TextEdit[]][] {
    const textEdits = new Map<string, [Uri, TextEdit[]]>();
    for (const candidate of this._edits) {
      if (candidate._type === 2) {
        let textEdit = textEdits.get(candidate.uri.toString());
        if (!textEdit) {
          textEdit = [candidate.uri, []];
          textEdits.set(candidate.uri.toString(), textEdit);
        }
        textEdit[1].push(candidate.edit);
      }
    }
    return values(textEdits);
  }

  _allEntries(): ([Uri, TextEdit[]] | [Uri?, Uri?, IFileOperationOptions?])[] {
    const res: ([Uri, TextEdit[]] | [Uri?, Uri?, IFileOperationOptions?])[] = [];
    for (const edit of this._edits) {
      if (edit._type === 1) {
        res.push([edit.from, edit.to, edit.options]);
      } else {
        res.push([edit.uri, [edit.edit]]);
      }
    }
    return res;
  }

  get size(): number {
    return this.entries().length;
  }

  toJSON(): any {
    return this.entries();
  }
}

export enum TextEditorRevealType {
  Default = 0,
  InCenter = 1,
  InCenterIfOutsideViewport = 2,
  AtTop = 3,
}

export enum TextEditorSelectionChangeKind {
  Keyboard = 1,
  Mouse = 2,
  Command = 3,
}

export class SnippetString {
  static isSnippetString(thing: any): thing is SnippetString {
    if (thing instanceof SnippetString) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return typeof (<SnippetString>thing).value === "string";
  }

  private static _escape(value: string): string {
    return value.replace(/\$|}|\\/g, "\\$&");
  }

  private _tabstop = 1;

  value: string;

  constructor(value?: string) {
    this.value = value || "";
  }

  appendText(string: string): SnippetString {
    this.value += SnippetString._escape(string);
    return this;
  }

  appendTabstop(number: number = this._tabstop++): SnippetString {
    this.value += "$";
    this.value += number;
    return this;
  }

  appendPlaceholder(
    value: string | ((snippet: SnippetString) => any),
    number: number = this._tabstop++,
  ): SnippetString {
    if (typeof value === "function") {
      const nested = new SnippetString();
      nested._tabstop = this._tabstop;
      value(nested);
      this._tabstop = nested._tabstop;
      value = nested.value;
    } else {
      value = SnippetString._escape(value);
    }

    this.value += "${";
    this.value += number;
    this.value += ":";
    this.value += value;
    this.value += "}";

    return this;
  }

  appendVariable(name: string, defaultValue?: string | ((snippet: SnippetString) => any)): SnippetString {
    if (typeof defaultValue === "function") {
      const nested = new SnippetString();
      nested._tabstop = this._tabstop;
      defaultValue(nested);
      this._tabstop = nested._tabstop;
      defaultValue = nested.value;
    } else if (typeof defaultValue === "string") {
      defaultValue = defaultValue.replace(/\$|}/g, "\\$&");
    }

    this.value += "${";
    this.value += name;
    if (defaultValue) {
      this.value += ":";
      this.value += defaultValue;
    }
    this.value += "}";

    return this;
  }
}
