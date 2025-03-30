import * as monaco from "monaco-editor";

/**
 * A folding provider for Markdown that adds folding regions for headers
 */
export class MarkdownFoldingProvider implements monaco.languages.FoldingRangeProvider {
  provideFoldingRanges(
    model: monaco.editor.ITextModel,
    context: monaco.languages.FoldingContext,
    token: monaco.CancellationToken
  ): monaco.languages.FoldingRange[] {
    const ranges: monaco.languages.FoldingRange[] = [];
    const headerStack: { level: number; line: number }[] = [];

    // Process each line of the document
    for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
      const line = model.getLineContent(lineNumber);
      
      // Check if the line is a markdown header
      const headerMatch = line.match(/^(#{1,6})\s+(.*?)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        
        // Pop headers of the same or lower level from the stack
        while (
          headerStack.length > 0 && 
          headerStack[headerStack.length - 1].level >= level
        ) {
          const header = headerStack.pop();
          // Add folding range for the popped header (from header line to current line - 1)
          if (header && lineNumber - header.line > 1) { // Only add if there's content to fold
            ranges.push({
              start: header.line,
              end: lineNumber - 1,
              kind: monaco.languages.FoldingRangeKind.Region
            });
          }
        }
        
        // Push the current header to the stack
        headerStack.push({ level, line: lineNumber });
      }
    }
    
    // Process any remaining headers in the stack
    while (headerStack.length > 0) {
      const header = headerStack.pop();
      if (header && model.getLineCount() - header.line > 0) { // Only add if there's content to fold
        ranges.push({
          start: header.line,
          end: model.getLineCount(),
          kind: monaco.languages.FoldingRangeKind.Region
        });
      }
    }
    
    return ranges;
  }
}

/**
 * Register the Markdown folding provider with Monaco
 */
export function registerFoldingProvider(monaco: typeof import("monaco-editor")) {
  monaco.languages.registerFoldingRangeProvider("markdown", new MarkdownFoldingProvider());
} 