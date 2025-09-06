import * as vscode from 'vscode';
import { isTaskLine, parseTaskLine } from '../core/task-list/parser';
import { toggleTaskCompletion, getIndentLevel } from '../core/task-list/utils';
import type { TaskStorage } from '../storage/task-storage';

export async function toggleTaskCommand(taskStorage: TaskStorage) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') return;

  const position = editor.selection.active;
  const line = editor.document.lineAt(position.line);
  
  if (!isTaskLine(line.text)) {
    vscode.window.showInformationMessage('Cursor is not on a task line');
    return;
  }

  const newText = toggleTaskCompletion(line.text);
  
  await editor.edit((editBuilder) => {
    editBuilder.replace(line.range, newText);
  });

  // Store task completion if it was checked
  if (newText.includes('[x]') || newText.includes('[X]')) {
    const taskContent = line.text.replace(/^(\s*)[-*]\s*\[\s*[xX ]?\s*\]\s*/, '');
    await taskStorage.addCompletedTask({
      content: taskContent,
      completedAt: new Date().toISOString(),
      lineNumber: position.line,
    });
  }
}

export async function moveTaskUpCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') return;

  const position = editor.selection.active;
  const currentLine = position.line;
  
  if (currentLine === 0) {
    vscode.window.showInformationMessage('Cannot move first line up');
    return;
  }

  const line = editor.document.lineAt(currentLine);
  if (!isTaskLine(line.text)) {
    vscode.window.showInformationMessage('Cursor is not on a task line');
    return;
  }

  // Find previous line at same or parent indentation level
  const currentIndent = getIndentLevel(line.text);
  let targetLine = currentLine - 1;
  
  while (targetLine >= 0) {
    const targetLineText = editor.document.lineAt(targetLine).text;
    const targetIndent = getIndentLevel(targetLineText);
    
    // Skip empty lines
    if (targetLineText.trim() === '') {
      targetLine--;
      continue;
    }
    
    // Found a line at same or parent level
    if (targetIndent <= currentIndent) {
      break;
    }
    
    targetLine--;
  }

  if (targetLine < 0) {
    vscode.window.showInformationMessage('Cannot move task up further');
    return;
  }

  // Swap lines
  await editor.edit((editBuilder) => {
    const currentLineRange = editor.document.lineAt(currentLine).rangeIncludingLineBreak;
    const targetLineRange = editor.document.lineAt(targetLine).rangeIncludingLineBreak;
    
    const currentText = editor.document.getText(currentLineRange);
    const targetText = editor.document.getText(targetLineRange);
    
    editBuilder.replace(currentLineRange, targetText);
    editBuilder.replace(targetLineRange, currentText);
  });

  // Move cursor to the new position
  const newPosition = position.with(targetLine, position.character);
  editor.selection = new vscode.Selection(newPosition, newPosition);
}

export async function moveTaskDownCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') return;

  const position = editor.selection.active;
  const currentLine = position.line;
  const lastLine = editor.document.lineCount - 1;
  
  if (currentLine >= lastLine) {
    vscode.window.showInformationMessage('Cannot move last line down');
    return;
  }

  const line = editor.document.lineAt(currentLine);
  if (!isTaskLine(line.text)) {
    vscode.window.showInformationMessage('Cursor is not on a task line');
    return;
  }

  // Find next line at same or parent indentation level
  const currentIndent = getIndentLevel(line.text);
  let targetLine = currentLine + 1;
  
  while (targetLine <= lastLine) {
    const targetLineText = editor.document.lineAt(targetLine).text;
    const targetIndent = getIndentLevel(targetLineText);
    
    // Skip empty lines
    if (targetLineText.trim() === '') {
      targetLine++;
      continue;
    }
    
    // Found a line at same or parent level
    if (targetIndent <= currentIndent) {
      break;
    }
    
    targetLine++;
  }

  if (targetLine > lastLine) {
    vscode.window.showInformationMessage('Cannot move task down further');
    return;
  }

  // Swap lines
  await editor.edit((editBuilder) => {
    const currentLineRange = editor.document.lineAt(currentLine).rangeIncludingLineBreak;
    const targetLineRange = editor.document.lineAt(targetLine).rangeIncludingLineBreak;
    
    const currentText = editor.document.getText(currentLineRange);
    const targetText = editor.document.getText(targetLineRange);
    
    editBuilder.replace(currentLineRange, targetText);
    editBuilder.replace(targetLineRange, currentText);
  });

  // Move cursor to the new position
  const newPosition = position.with(targetLine, position.character);
  editor.selection = new vscode.Selection(newPosition, newPosition);
}