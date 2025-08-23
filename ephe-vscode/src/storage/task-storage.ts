import * as vscode from 'vscode';

type CompletedTask = {
  content: string;
  completedAt: string;
  lineNumber: number;
  filePath?: string;
};

export class TaskStorage {
  private static readonly STORAGE_KEY = 'ephe.completedTasks';
  
  constructor(private context: vscode.ExtensionContext) {}

  async getCompletedTasks(): Promise<CompletedTask[]> {
    return this.context.globalState.get<CompletedTask[]>(TaskStorage.STORAGE_KEY, []);
  }

  async addCompletedTask(task: CompletedTask): Promise<void> {
    const tasks = await this.getCompletedTasks();
    
    // Add file path if available
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      task.filePath = editor.document.uri.fsPath;
    }
    
    tasks.push(task);
    
    // Keep only last 1000 tasks
    const recentTasks = tasks.slice(-1000);
    
    await this.context.globalState.update(TaskStorage.STORAGE_KEY, recentTasks);
    
    // Check if auto-flush is enabled
    const config = vscode.workspace.getConfiguration('ephe');
    if (config.get<boolean>('autoFlushCompletedTasks')) {
      // In auto-flush mode, we could remove the completed task from the document
      // This would be implemented in the command handler
    }
  }

  async clearCompletedTasks(): Promise<void> {
    await this.context.globalState.update(TaskStorage.STORAGE_KEY, []);
  }

  async getTaskHistory(filePath?: string): Promise<CompletedTask[]> {
    const tasks = await this.getCompletedTasks();
    
    if (filePath) {
      return tasks.filter(task => task.filePath === filePath);
    }
    
    return tasks;
  }
}