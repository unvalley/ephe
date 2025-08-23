import * as vscode from 'vscode';

export class MarkdownFormattingProvider implements vscode.DocumentFormattingEditProvider {
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): Promise<vscode.TextEdit[]> {
    // For now, we'll provide basic formatting
    // In the future, we can integrate dprint WASM here
    
    const edits: vscode.TextEdit[] = [];
    const text = document.getText();
    
    // Basic formatting rules:
    // 1. Ensure consistent task list formatting
    // 2. Normalize whitespace
    
    const lines = text.split('\n');
    const formattedLines: string[] = [];
    
    for (const line of lines) {
      let formattedLine = line;
      
      // Normalize task list formatting
      formattedLine = formattedLine.replace(/^(\s*)[-*]\s*\[\s*\]/g, '$1- [ ]');
      formattedLine = formattedLine.replace(/^(\s*)[-*]\s*\[\s*[xX]\s*\]/g, '$1- [x]');
      
      // Ensure single space after list markers
      formattedLine = formattedLine.replace(/^(\s*[-*+])\s{2,}/g, '$1 ');
      
      formattedLines.push(formattedLine);
    }
    
    const formattedText = formattedLines.join('\n');
    
    if (formattedText !== text) {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
      );
      edits.push(vscode.TextEdit.replace(fullRange, formattedText));
    }
    
    return edits;
  }
}