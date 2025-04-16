/**
 * Utility functions for detecting task sections in markdown for CodeMirror
 */
import { EditorView } from "@codemirror/view";

/**
 * Find the section heading that a task belongs to
 */
export const findTaskSection = (view: EditorView, lineNumber: number): string | undefined => {
  const { doc } = view.state;

  // Start from the task line and go upwards
  for (let i = lineNumber; i >= 1; i--) {
    const line = doc.line(i);
    const lineText = line.text;

    // Check if line is a markdown heading (starts with # and has text)
    if (/^#{1,6}\s+\S/.test(lineText)) {
      return lineText.trim();
    }
  }

  return undefined;
};
