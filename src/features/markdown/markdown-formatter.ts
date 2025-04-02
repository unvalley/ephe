/**
 * Markdown formatter interface for dependency inversion
 */
export type MarkdownFormatter = {
  /**
   * Format markdown text
   */
  formatMarkdown(text: string): Promise<string>;
};

/**
 * Configuration for markdown formatter
 */
export type FormatterConfig = {
  indentWidth?: number;
  lineWidth?: number;
  useTabs?: boolean;
  newLineKind?: "auto" | "lf" | "crlf" | "system";
  [key: string]: unknown;
};
