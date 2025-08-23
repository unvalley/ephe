import * as vscode from 'vscode';
import { TaskCompletionProvider } from './providers/completion';
import { toggleTaskCommand, moveTaskUpCommand, moveTaskDownCommand } from './providers/commands';
import { MarkdownFormattingProvider } from './providers/formatting';
import { TaskStorage } from './storage/task-storage';

export function activate(context: vscode.ExtensionContext) {
  console.log('Ephe VS Code extension is now active!');

  // Initialize task storage
  const taskStorage = new TaskStorage(context);

  // Register completion provider for task auto-completion
  const completionProvider = new TaskCompletionProvider();
  const completionDisposable = vscode.languages.registerCompletionItemProvider(
    'markdown',
    completionProvider,
    ' ' // Trigger on space
  );

  // Register commands
  const toggleTask = vscode.commands.registerCommand('ephe.toggleTask', () =>
    toggleTaskCommand(taskStorage)
  );
  
  const moveTaskUp = vscode.commands.registerCommand('ephe.moveTaskUp', moveTaskUpCommand);
  const moveTaskDown = vscode.commands.registerCommand('ephe.moveTaskDown', moveTaskDownCommand);

  // Register formatting provider
  const formattingProvider = new MarkdownFormattingProvider();
  const formattingDisposable = vscode.languages.registerDocumentFormattingEditProvider(
    'markdown',
    formattingProvider
  );

  const formatCommand = vscode.commands.registerCommand('ephe.formatDocument', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') return;
    
    await vscode.commands.executeCommand('editor.action.formatDocument');
  });

  // Register all disposables
  context.subscriptions.push(
    completionDisposable,
    toggleTask,
    moveTaskUp,
    moveTaskDown,
    formattingDisposable,
    formatCommand
  );

  // Set up keyboard shortcuts for special behaviors
  setupKeyboardHandlers(context);
}

function setupKeyboardHandlers(context: vscode.ExtensionContext) {
  // Handle Enter key for creating new tasks
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId !== 'markdown') return;
    if (event.contentChanges.length === 0) return;

    const change = event.contentChanges[0];
    if (change.text !== '\n') return;

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== event.document) return;

    // This will be handled by VS Code's built-in list continuation
    // We'll enhance this in a future update
  });
}

export function deactivate() {
  console.log('Ephe VS Code extension is now deactivated');
}