import { parse } from "@textlint/markdown-to-ast";
import type { TxtDocumentNode, TxtNode, TxtParentNode, TxtListItemNode } from "@textlint/ast-node-types";

export type TaskListCount = {
  open: number;
  closed: number;
}

export type MarkdownProcessingResult = {
  taskCount: TaskListCount;
}

/**
 * Task item with its line number information
 */
export type TaskWithLineNumber = {
  line: number;
  checked: boolean;
}

/**
 * Task list hierarchy information
 */
export type TaskHierarchy = {
  line: number;
  level: number;
  parentLine?: number;
}

/**
 * Markdown service that handles processing markdown content
 * using @textlint/markdown-to-ast for parsing and custom rendering
 */
export class MarkdownAstService {
  private static instance: MarkdownAstService | null = null;
  private constructor() {}

  public static getInstance(): MarkdownAstService {
    if (!MarkdownAstService.instance) {
      MarkdownAstService.instance = new MarkdownAstService();
    }
    return MarkdownAstService.instance;
  }

  public getAst(markdown: string): TxtDocumentNode {
    const doc = parse(markdown);
    return doc
  }

  /**
   * Process markdown content and return the processed result
   * including HTML, task counts, and character count
   */
  public processMarkdown(content: string): MarkdownProcessingResult {
    if (!content) {
      return {
        taskCount: { open: 0, closed: 0 },
      };
    }
    const ast = this.getAst(content);
    return {
      taskCount: this.countTasks(ast),
    };
  }
  

  /**
   * Count tasks in the document
   */
  public countTasks(node: TxtDocumentNode): TaskListCount {
    const result: TaskListCount = {
      closed: 0,
      open: 0,
    };
    this.countTasksRecursively(node, result);
    return result;
  }

  /**
   * Find checked tasks with their line numbers
   */
  public findCheckedTasks(node: TxtDocumentNode): TaskWithLineNumber[] {
    const tasks: TaskWithLineNumber[] = [];
    this.findCheckedTasksRecursively(node, tasks);
    return tasks;
  }

  /**
   * Find checked tasks recursively
   */
  private findCheckedTasksRecursively(
    node: TxtNode,
    tasks: TaskWithLineNumber[]
  ): void {
    if (node.type === "ListItem" && (node as TxtListItemNode).checked === true) {
      tasks.push({
        line: node.loc.start.line,
        checked: true
      });
    }

    if (this.isParentNode(node)) {
      for (const child of node.children) {
        this.findCheckedTasksRecursively(child, tasks);
      }
    }
  }

  private isParentNode(node: TxtNode): node is TxtParentNode {
    return "children" in node;
  }

  /**
   * Count tasks recursively
   */
  private countTasksRecursively(
    node: TxtNode,
    result: TaskListCount,
  ): void {
    if (node.type === "ListItem" && (node as TxtListItemNode).checked !== undefined) {
      if ((node as TxtListItemNode).checked) {
        result.closed++;
      } else {
        result.open++;
      }
    }

    if (this.isParentNode(node)) {
      for (const child of node.children) {
        this.countTasksRecursively(child, result);
      }
    }
  }

  /**
   * Get task hierarchy information
   * @param ast The markdown AST
   * @returns Array of task hierarchy information
   */
  public getTaskHierarchy(ast: TxtDocumentNode): TaskHierarchy[] {
    const hierarchy: TaskHierarchy[] = [];
    this.findTaskHierarchyRecursively(ast, hierarchy);
    return hierarchy;
  }

  /**
   * Check if a task can be indented at the given line
   * @param ast The markdown AST
   * @param line The line number to check
   * @returns true if the task can be indented
   */
  public canIndentTask(ast: TxtDocumentNode, line: number): boolean {
    const hierarchy = this.getTaskHierarchy(ast);
    const task = hierarchy.find(t => t.line === line);
    
    if (!task) return false;
    
    // Find the parent task
    const parent = task.parentLine ? hierarchy.find(t => t.line === task.parentLine) : undefined;
    
    // If no parent (top-level task), we can only indent once (level 0 -> level 1)
    if (!parent) {
      return task.level === 0;
    }
    
    // STRICT RULE: A task can only be at the same indentation level as its parent
    // This means it cannot be indented beyond its parent's level
    return task.level === parent.level;
  }

  /**
   * Recursively find task list hierarchy
   * @param node The current node
   * @param hierarchy Array to collect hierarchy information
   * @param currentLevel Current nesting level
   * @param parentLine Line number of parent task
   */
  private findTaskHierarchyRecursively(
    node: TxtNode,
    hierarchy: TaskHierarchy[],
    currentLevel = 0,
    parentLine?: number
  ): void {
    // Keep track of the current line if this is a task item
    let thisIsTaskItem = false;
    let currentTaskLine = -1;
    
    if (node.type === "ListItem") {
      const listItemNode = node as TxtListItemNode;
      
      // Only process if it's a task item (has checked attribute)
      if (listItemNode.checked !== undefined) {
        thisIsTaskItem = true;
        currentTaskLine = node.loc.start.line;
        
        // Get raw text to calculate indentation
        const rawText = node.raw;
        // Count leading spaces to determine indentation level
        const leadingSpaces = rawText.match(/^\s*/)?.[0].length || 0;
        const indentLevel = Math.floor(leadingSpaces / 2);
        
        hierarchy.push({
          line: currentTaskLine,
          level: indentLevel,
          parentLine
        });
      }
    }
    
    // Process children if this node has any
    if (this.isParentNode(node)) {
      // If this node is a task item, it becomes the parent for its children
      const newParentLine = thisIsTaskItem ? currentTaskLine : parentLine;
      
      for (const child of node.children) {
        this.findTaskHierarchyRecursively(
          child,
          hierarchy,
          currentLevel + 1,
          newParentLine
        );
      }
    }
  }
}

// singleton
export const markdownService = MarkdownAstService.getInstance(); 