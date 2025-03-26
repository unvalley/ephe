import type { Range } from "./extHostTypes";

/**
 * Represents a line of text, such as a line of source code.
 *
 * TextLine objects are __immutable__. When a [document](#TextDocument) changes,
 * previously retrieved lines will not represent the latest state.
 */
export type TextLine = {
  /**
   * The zero-based line number.
   */
  readonly lineNumber: number;

  /**
   * The text of this line without the line separator characters.
   */
  readonly text: string;

  /**
   * The range this line covers without the line separator characters.
   */
  readonly range: Range;

  /**
   * The range this line covers with the line separator characters.
   */
  readonly rangeIncludingLineBreak: Range;

  /**
   * The offset of the first character which is not a whitespace character as defined
   * by `/\s/`. **Note** that if a line is all whitespace the length of the line is returned.
   */
  readonly firstNonWhitespaceCharacterIndex: number;

  /**
   * Whether this line is whitespace only, shorthand
   * for [TextLine.firstNonWhitespaceCharacterIndex](#TextLine.firstNonWhitespaceCharacterIndex) === [TextLine.text.length](#TextLine.text).
   */
  readonly isEmptyOrWhitespace: boolean;
}
