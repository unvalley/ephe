/**
 * Utility functions for detecting task sections in markdown
 */
import type * as monaco from "monaco-editor";

/**
 * Find the section heading that a task belongs to
 * @param model The editor model
 * @param lineNumber The line number of the task
 * @returns The section heading text or undefined if not found
 */
export const findTaskSection = (model: monaco.editor.ITextModel, lineNumber: number): string | undefined => {
  // Start from the task line and go upwards
  for (let i = lineNumber; i >= 1; i--) {
    const line = model.getLineContent(i);

    // Check if line is a markdown heading (starts with # and has text)
    if (/^#{1,6}\s+\S/.test(line)) {
      // Return the heading text including the # symbols
      return line.trim();
    }
  }

  return undefined;
};
