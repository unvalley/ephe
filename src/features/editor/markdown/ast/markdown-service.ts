import { parse } from "@textlint/markdown-to-ast";
import type { TxtDocumentNode, TxtNode, TxtParentNode, TxtListItemNode } from "@textlint/ast-node-types";
import { LOCAL_STORAGE_KEYS } from "src/utils/constants";

// ローカルストレージのキー
const COMPLETED_TASKS_STORAGE_KEY = "completed_tasks_timestamps";

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
 * Task item with completion timestamp
 */
export type CompletedTaskWithTimestamp = TaskWithLineNumber & {
  completedAt: Date;
};

/**
 * Stored task data structure
 */
type StoredTaskData = {
  [lineNumber: string]: number; // タイムスタンプを数値で保存
};

/**
 * Markdown service that handles processing markdown content
 * using @textlint/markdown-to-ast for parsing and custom rendering
 */
export class MarkdownAstService {
  private static instance: MarkdownAstService | null = null;
  private closedTasksTimestamps: Map<number, Date> = new Map();

  private constructor() {
    // Load data from localStorage when the instance is created
    this.loadClosedTasksFromStorage();
  }

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
   * Load closed tasks data from localStorage
   */
  private loadClosedTasksFromStorage(): void {
    try {
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEYS.CLOSED_TASKS);
      if (storedData) {
        const parsedData: StoredTaskData = JSON.parse(storedData);

        // Convert stored data to Map
        this.closedTasksTimestamps = new Map();
        Object.entries(parsedData).forEach(([lineStr, timestamp]) => {
          const line = parseInt(lineStr, 10);
          this.closedTasksTimestamps.set(line, new Date(timestamp));
        });
      }
    } catch (error) {
      console.error("Error loading closed tasks data:", error);
    }
  }

  /**
   * Save completed tasks data to localStorage
   */
  private saveClosedTasksToStorage(): void {
    try {
      const dataToStore: StoredTaskData = {};

      // Convert Map to plain object for storage
      this.closedTasksTimestamps.forEach((date, line) => {
        dataToStore[line.toString()] = date.getTime();
      });

      localStorage.setItem(LOCAL_STORAGE_KEYS.CLOSED_TASKS, JSON.stringify(dataToStore));
    } catch (error) {
      console.error("Error saving closed tasks data:", error);
    }
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

      // count only if the checked attribute is true or false (undefined or null means no checkbox)
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
   * Record a completed task with its completion timestamp
   * @param taskLine Line number of the task
   * @param timestamp Completion timestamp
   */
  public recordCompletedTask(taskLine: number, timestamp: Date = new Date()): void {
    this.closedTasksTimestamps.set(taskLine, timestamp);
    // Save task information to localStorage
    this.saveClosedTasksToStorage();
  }

  /**
   * Remove a task from the completed tasks registry
   * @param taskLine Line number of the task to remove
   */
  public removeCompletedTask(taskLine: number): void {
    if (this.closedTasksTimestamps.has(taskLine)) {
      this.closedTasksTimestamps.delete(taskLine);
      // 変更を永続化
      this.saveClosedTasksToStorage();
    }
  }

  /**
   * Find completed tasks with their completion timestamps
   * @param ast The markdown AST
   * @returns Array of completed tasks with timestamps
   */
  public findCompletedTasksWithTimestamps(ast: TxtDocumentNode): CompletedTaskWithTimestamp[] {
    const tasks = this.findCheckedTasksWithLineNumbers(ast);
    const now = new Date();

    return tasks
      .filter((task) => task.checked)
      .map((task) => {
        // Use recorded timestamp if available, otherwise use current time
        const completedAt = this.closedTasksTimestamps.get(task.line) || now;
        return {
          ...task,
          completedAt,
        };
      });
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
   * Check if there are any pending tasks that should be cleared
   * based on the specified mode and timing
   * @param mode Auto clear mode
   * @returns Array of task lines that should be cleared
   */
  public getTasksToBeCleared(mode: "hourly" | "daily"): number[] {
    const now = new Date();
    const tasksToRemove: number[] = [];

    this.closedTasksTimestamps.forEach((completedAt, taskLine) => {
      let shouldClear = false;

      if (mode === "hourly") {
        // 1時間経過したかチェック
        const hourLater = new Date(completedAt);
        hourLater.setHours(hourLater.getHours() + 1);
        shouldClear = now >= hourLater;
      } else if (mode === "daily") {
        // 日付が変わったかチェック
        const taskDate = completedAt.toDateString();
        const currentDate = now.toDateString();
        shouldClear = taskDate !== currentDate;
      }

      if (shouldClear) {
        tasksToRemove.push(taskLine);
      }
    });

    return tasksToRemove;
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
