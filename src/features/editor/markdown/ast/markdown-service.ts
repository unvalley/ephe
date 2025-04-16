import { parse } from "@textlint/markdown-to-ast";
import type { TxtDocumentNode, TxtNode, TxtParentNode, TxtListItemNode } from "@textlint/ast-node-types";

export type TaskListCount = {
  open: number;
  closed: number;
};

export type MarkdownProcessingResult = {
  taskCount: TaskListCount;
};

/**
 * Task item with its line number information
 */
export type TaskWithLineNumber = {
  line: number;
  checked: boolean;
};

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
    return doc;
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
   * Recursively traverses the AST to count all nested tasks
   */
  public countTasks(ast: TxtDocumentNode): TaskListCount {
    const taskCount: TaskListCount = { open: 0, closed: 0 };
    this.countTasksRecursively(ast, taskCount);
    return taskCount;
  }

  /**
   * recursively traverse the AST to count all nested tasks
   * @param node the current node
   * @param taskCount the result of task count
   */
  private countTasksRecursively(node: TxtNode, taskCount: TaskListCount): void {
    // if the node is a ListItem node, check the checked attribute
    if (node.type === "ListItem") {
      const listItemNode = node as TxtListItemNode;

      // count only if the checked attribute is true or false (undefined or null means no task)
      if (listItemNode.checked === true) {
        taskCount.closed++;
      } else if (listItemNode.checked === false) {
        taskCount.open++;
      }
    }

    // if the node is a parent node, recursively count the tasks
    if (this.isParentNode(node)) {
      for (const child of node.children) {
        this.countTasksRecursively(child, taskCount);
      }
    }
  }

  /**
   * Find all checked task items with their line numbers
   * @param ast The markdown AST
   * @returns Array of tasks with line numbers
   */
  public findCheckedTasksWithLineNumbers(ast: TxtDocumentNode): TaskWithLineNumber[] {
    const tasks: TaskWithLineNumber[] = [];
    this.findTasksRecursively(ast, tasks);
    return tasks;
  }

  /**
   * Recursively find all task items with their line numbers
   * @param node The current node
   * @param tasks Array to collect found tasks
   */
  private findTasksRecursively(node: TxtNode, tasks: TaskWithLineNumber[]): void {
    // If it's a ListItem node with checked attribute
    if (node.type === "ListItem") {
      const listItemNode = node as TxtListItemNode;

      // Only add if checked is explicitly true or false (not undefined or null)
      if (listItemNode.checked === true || listItemNode.checked === false) {
        tasks.push({
          line: node.loc.start.line,
          checked: listItemNode.checked,
        });
      }
    }

    // Recursively process child nodes if they exist
    if (this.isParentNode(node)) {
      for (const child of node.children) {
        this.findTasksRecursively(child, tasks);
      }
    }
  }

  /**
   * check if the node is a parent node (node with children)
   * @param node the node to check
   * @returns true if the node is a parent node
   */
  private isParentNode(node: TxtNode): node is TxtParentNode {
    return "children" in node && Array.isArray((node as TxtParentNode).children);
  }
}

// singleton
export const markdownService = MarkdownAstService.getInstance();
