/**
 * Utilities for handling GitHub integration in markdown sections
 */
import type * as monaco from "monaco-editor";
import { fetchAssignedIssues, generateIssuesTaskList } from "./github-api";
import { showToast } from "../../components/toast";

// Regex pattern to match GitHub issue section headers
// Matches: ## @GitHub/issues/assigned
const GITHUB_ISSUES_SECTION_REGEX = /^##\s+@GitHub\/issues\/assigned\s*$/;

/**
 * Check if a line is a GitHub issues section header
 * @param lineContent The content of the line to check
 * @returns True if the line is a GitHub issues section header
 */
export const isGitHubIssuesSection = (lineContent: string): boolean => {
  return GITHUB_ISSUES_SECTION_REGEX.test(lineContent);
};

/**
 * Process GitHub sections in the editor and update them with data
 * @param editor The Monaco editor instance
 * @param model The editor model
 * @param username The GitHub username to fetch data for
 */
export const processGitHubSections = async (
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel,
  username: string
): Promise<void> => {
  const lineCount = model.getLineCount();
  let sectionFound = false;
  
  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    const lineContent = model.getLineContent(lineNumber);
    
    if (isGitHubIssuesSection(lineContent)) {
      sectionFound = true;
      await updateGitHubIssuesSection(editor, model, lineNumber, username);
    }
  }
  
  if (!sectionFound) {
    // No sections found, do nothing
    return;
  }
};

/**
 * Update a GitHub issues section with fetched data
 * @param editor The Monaco editor instance
 * @param model The editor model
 * @param sectionLineNumber The line number of the section header
 * @param username The GitHub username to fetch data for
 */
const updateGitHubIssuesSection = async (
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel,
  sectionLineNumber: number,
  username: string
): Promise<void> => {
  try {
    // Check if there's already content in the section
    const sectionEndLineNumber = findSectionEndLineNumber(model, sectionLineNumber);
    const hasExistingContent = checkForExistingContent(model, sectionLineNumber, sectionEndLineNumber);
    
    // Fetch assigned GitHub issues
    const issues = await fetchAssignedIssues(username);
    const issuesMarkdown = generateIssuesTaskList(issues);
    
    // Determine where to insert or replace content
    const startLine = sectionLineNumber + 1;
    const endLine = hasExistingContent ? sectionEndLineNumber : startLine;
    
    // Apply the edit to insert or replace content
    editor.executeEdits("", [
      {
        range: {
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: endLine,
          endColumn: 1,
        },
        text: `\n${issuesMarkdown}\n\n`,
      },
    ]);
    
    showToast(`Updated GitHub issues for ${username}`, "success");
  } catch (error) {
    console.error("Error updating GitHub issues section:", error);
    showToast("Failed to update GitHub issues", "error");
  }
};

/**
 * Find the end line number of a section
 * A section ends at the next heading or the end of the document
 * @param model The editor model
 * @param sectionLineNumber The line number of the section header
 * @returns The line number where the section ends
 */
const findSectionEndLineNumber = (
  model: monaco.editor.ITextModel, 
  sectionLineNumber: number
): number => {
  const lineCount = model.getLineCount();
  
  for (let i = sectionLineNumber + 1; i <= lineCount; i++) {
    const lineContent = model.getLineContent(i);
    
    // If we find another heading, the section ends
    if (/^#{1,6}\s+\S/.test(lineContent)) {
      return i - 1;
    }
  }
  
  // If no next heading is found, the section ends at the end of the document
  return lineCount;
};

/**
 * Check if a section already has content
 * @param model The editor model
 * @param startLineNumber The starting line of the section
 * @param endLineNumber The ending line of the section
 * @returns True if the section has non-empty content
 */
const checkForExistingContent = (
  model: monaco.editor.ITextModel,
  startLineNumber: number,
  endLineNumber: number
): boolean => {
  // Skip the section header line
  const contentStartLine = startLineNumber + 1;
  
  if (contentStartLine > endLineNumber) {
    return false;
  }
  
  for (let i = contentStartLine; i <= endLineNumber; i++) {
    const lineContent = model.getLineContent(i).trim();
    if (lineContent.length > 0) {
      return true;
    }
  }
  
  return false;
}; 