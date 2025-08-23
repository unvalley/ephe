import * as vscode from 'vscode';

export class TaskCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    // Only trigger on space
    if (context.triggerCharacter !== ' ') {
      return undefined;
    }

    const line = document.lineAt(position.line);
    const linePrefix = line.text.substring(0, position.character);

    // Check for patterns like "- [" or "-["
    const patterns = [
      { pattern: /- \[$/, replacement: '- [ ] ', label: 'Task checkbox' },
      { pattern: /-\[$/, replacement: '- [ ] ', label: 'Task checkbox' },
      { pattern: /\* \[$/, replacement: '* [ ] ', label: 'Task checkbox' },
      { pattern: /\*\[$/, replacement: '* [ ] ', label: 'Task checkbox' },
    ];

    for (const { pattern, replacement, label } of patterns) {
      if (pattern.test(linePrefix)) {
        const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
        
        // Calculate the range to replace
        const startPos = position.translate(0, -(linePrefix.match(pattern)?.[0].length ?? 0));
        const range = new vscode.Range(startPos, position);
        
        item.insertText = replacement;
        item.range = range;
        item.detail = 'Insert task checkbox';
        item.documentation = 'Completes the task list syntax with checkbox and trailing space';
        
        return [item];
      }
    }

    return undefined;
  }
}