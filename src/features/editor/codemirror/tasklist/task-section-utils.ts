import type { EditorView } from "@codemirror/view";

const MARKDOWN_HEADING = /^#{1,6}\s+\S/;

export const isHeadingLine = (text: string): boolean => MARKDOWN_HEADING.test(text);

/**
 * Return the nearest markdown heading above `lineNumber`.
 * `undefined` if none exists.
 */
export const findTaskSection = (view: EditorView, lineNumber: number): string | undefined => {
  const { doc } = view.state;

  for (let i = lineNumber; i >= 1; i--) {
    const text = doc.line(i).text.trim();
    if (isHeadingLine(text)) return text;
  }
};
