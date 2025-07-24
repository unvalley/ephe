import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { Text } from "@codemirror/state";
import { atomWithStorage } from "jotai/utils";
import { getDefaultStore } from "jotai";
import { LOCAL_STORAGE_KEYS } from "../../../../utils/constants";
import { taskAgingEnabledAtom } from "../../../../utils/hooks/use-task-aging";

type ISOString = string & { readonly __brand: "ISOString" };
// `indent:content:line`
type TaskKey = `${number}:${string}:${number}` & { readonly __brand: "TaskKey" };

const createISOString = (): ISOString => {
  return new Date().toISOString() as ISOString;
};

// Type guards
const isValidISOString = (value: string): value is ISOString => {
  try {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date.toISOString() === value;
  } catch {
    return false;
  }
};

// TODO: Handle Error in a better way
const createTaskKey = (taskContent: string, indentLevel: number, lineNumber: number): TaskKey => {
  if (indentLevel < 0 || lineNumber <= 0 || taskContent.trim().length === 0) {
    throw new Error(`Invalid task key parameters: indent=${indentLevel}, line=${lineNumber}, content="${taskContent}"`);
  }
  return `${indentLevel}:${taskContent}:${lineNumber}` as TaskKey;
};

const isValidTaskKey = (value: string): value is TaskKey => {
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  
  const [indentStr, content, lineStr] = parts;
  const indent = parseInt(indentStr, 10);
  const line = parseInt(lineStr, 10);
  
  return !isNaN(indent) && 
         indent >= 0 && 
         typeof content === "string" && 
         content.length > 0 && 
         !isNaN(line) && 
         line > 0;
};


// Task creation times storage using atomWithStorage - now using ISO strings for consistency
const taskCreationTimesAtom = atomWithStorage<Record<TaskKey, ISOString>>(LOCAL_STORAGE_KEYS.TASK_AGING_TIMES, {});

const store = getDefaultStore();

// Get task creation times from atom
const getTaskCreationTimes = (): Record<TaskKey, ISOString> => {
  return store.get(taskCreationTimesAtom);
};

// Set task creation times to atom
const setTaskCreationTimes = (times: Record<TaskKey, ISOString>): void => {
  store.set(taskCreationTimesAtom, times);
};

// Get task aging enabled state from atom
const isTaskAgingEnabled = (): boolean => {
  return store.get(taskAgingEnabledAtom);
};

// Calculate task opacity based on age with proper error handling
const calculateTaskOpacity = (createdAt: ISOString): number => {
  try {
    const now = Date.now();
    const createdAtTime = new Date(createdAt).getTime();

    if (isNaN(createdAtTime)) {
      console.warn(`Invalid date string for task aging: ${createdAt}`);
      return 1.0; // Default to full opacity for invalid dates
    }

    // For testing purposes, use very short time intervals 24
    const ageInSeconds = (now - createdAtTime) / 1000; // Test in seconds

    if (ageInSeconds <= 10) return 1.0; // 0-10 seconds: full color
    if (ageInSeconds <= 20) return 0.8; // 10-20 seconds: slightly faded
    if (ageInSeconds <= 40) return 0.6; // 20-40 seconds: more faded
    return 0.4; // 40+ seconds: quite faded
  } catch (error) {
    console.error(`Error calculating task opacity for ${createdAt}:`, error);
    return 1.0; // Default to full opacity on error
  }
};

// Register task creation time
export const registerTaskCreation = (taskKey: TaskKey, taskContent: string, indentLevel: number): void => {
  const taskCreationTimes = getTaskCreationTimes();
  if (!(taskKey in taskCreationTimes)) {
    // Try to migrate from existing task with same content first
    migrateTaskByContent(taskContent, indentLevel, taskKey);

    // If no migration happened, create new entry
    const updatedTimes = getTaskCreationTimes();
    if (!(taskKey in updatedTimes)) {
      updatedTimes[taskKey] = createISOString();
      setTaskCreationTimes(updatedTimes);
    }
  }
};

// Reset task creation time (when task is edited)
const resetTaskCreation = (taskKey: TaskKey): void => {
  const taskCreationTimes = getTaskCreationTimes();
  taskCreationTimes[taskKey] = createISOString();
  setTaskCreationTimes(taskCreationTimes);
};

// Find and migrate task creation time based on content when task moves to different line
const migrateTaskByContent = (taskContent: string, indentLevel: number, newKey: TaskKey): void => {
  const taskCreationTimes = getTaskCreationTimes();
  let hasInvalidKeys = false;
  let updatedTimes = { ...taskCreationTimes };

  // Look for existing keys with same content but different line numbers
  for (const [existingKey, timestamp] of Object.entries(taskCreationTimes)) {
    // Validate existing key format
    if (!isValidTaskKey(existingKey)) {
      console.warn(`Invalid task key found during migration: ${existingKey}`);
      // Create new object without the invalid key
      updatedTimes = Object.fromEntries(
        Object.entries(updatedTimes).filter(([k]) => k !== existingKey)
      ) as Record<TaskKey, ISOString>;
      hasInvalidKeys = true;
      continue;
    }

    const keyParts = existingKey.split(":");
    if (keyParts.length === 3) {
      const existingIndent = parseInt(keyParts[0], 10);
      const existingContent = keyParts[1];

      if (!isNaN(existingIndent) && 
          existingIndent === indentLevel && 
          existingContent === taskContent && 
          existingKey !== newKey) {
        // Found matching content, migrate if new key doesn't exist
        if (!(newKey in updatedTimes) && isValidISOString(timestamp)) {
          // Create new object with migrated key
          updatedTimes = Object.fromEntries([
            ...Object.entries(updatedTimes).filter(([k]) => k !== existingKey),
            [newKey, timestamp]
          ]) as Record<TaskKey, ISOString>;
          setTaskCreationTimes(updatedTimes);
          return; // Only migrate once
        }
      }
    }
  }

  // Update if we found invalid keys
  if (hasInvalidKeys) {
    setTaskCreationTimes(updatedTimes);
  }
};

// Clean up old entries (older than 7 days) to prevent localStorage bloat
const cleanupOldEntries = (): void => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const taskCreationTimes = getTaskCreationTimes();
  
  const validEntries = Object.fromEntries(
    Object.entries(taskCreationTimes).filter(([key, timestamp]) => {
      // Remove entries with invalid key format
      if (!isValidTaskKey(key)) {
        console.warn(`Invalid task key found during cleanup: ${key}`);
        return false;
      }

      // Remove entries with invalid timestamp format
      if (!isValidISOString(timestamp)) {
        console.warn(`Invalid timestamp found during cleanup: ${timestamp}`);
        return false;
      }

      try {
        const timestampDate = new Date(timestamp).getTime();
        if (isNaN(timestampDate)) {
          console.warn(`Invalid timestamp date during cleanup: ${timestamp}`);
          return false;
        }
        
        // Keep entries that are newer than 7 days
        return timestampDate >= sevenDaysAgo;
      } catch (error) {
        console.warn(`Error parsing timestamp during cleanup: ${timestamp}`, error);
        return false;
      }
    })
  ) as Record<TaskKey, ISOString>;

  // Only update if changes were made
  if (Object.keys(validEntries).length !== Object.keys(taskCreationTimes).length) {
    setTaskCreationTimes(validEntries);
  }
};

// Initialize cleanup on module load
cleanupOldEntries();

// Task information interface
interface TaskInfo {
  readonly content: string;
  readonly indent: number;
  readonly key: TaskKey;
}

// Task aging plugin
export const taskAgingPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    updateTimer: number | null = null;
    previousTasksMap = new Map<number, TaskInfo>();

    constructor(view: EditorView) {
      this.buildTasksMap(view.state.doc);
      this.decorations = this.buildDecorations(view);
      this.scheduleUpdate(view);
    }

    // Build a map of current tasks for comparison
    buildTasksMap(doc: Text): void {
      this.previousTasksMap.clear();

      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const taskMatch = line.text.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);

        if (taskMatch?.[2] === " ") {
          const indentLevel = taskMatch[1]?.length ?? 0;
          const taskContent = taskMatch[3]?.trim() ?? "";
          const taskKey = createTaskKey(taskContent, indentLevel, i);

          this.previousTasksMap.set(i, {
            content: taskContent,
            indent: indentLevel,
            key: taskKey,
          });
        }
      }
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) {
        // Handle task migrations and detect actual edits
        this.handleTaskUpdates(update.view.state.doc);

        // Clean up old task entries when document changes
        this.cleanupOldTasks(update.view);
        this.decorations = this.buildDecorations(update.view);

        // Update tasks map for next iteration
        this.buildTasksMap(update.view.state.doc);
      }
    }

    // Handle task updates by migrating keys and detecting actual content changes
    handleTaskUpdates(doc: Text): void {
      const currentTasksMap = new Map<number, TaskInfo>();

      // Build current tasks map
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const taskMatch = line.text.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);

        if (taskMatch?.[2] === " ") {
          const indentLevel = taskMatch[1]?.length ?? 0;
          const taskContent = taskMatch[3]?.trim() ?? "";
          const taskKey = createTaskKey(taskContent, indentLevel, i);

          currentTasksMap.set(i, {
            content: taskContent,
            indent: indentLevel,
            key: taskKey,
          });
        }
      }

      // Compare with previous state and handle changes
      for (const [lineNum, currentTask] of currentTasksMap) {
        const previousTask = this.previousTasksMap.get(lineNum);

        if (previousTask) {
          if (previousTask.content !== currentTask.content) {
            // Content changed - reset creation time
            resetTaskCreation(currentTask.key);
          } else if (previousTask.key !== currentTask.key) {
            // Position changed but content same - migrate creation time
            migrateTaskByContent(currentTask.content, currentTask.indent, currentTask.key);
          }
        }
        // If no previous task at this line, registerTaskCreation will handle it in buildDecorations
      }
    }

    // Periodically update opacity
    scheduleUpdate(view: EditorView): void {
      this.updateTimer = window.setTimeout(() => {
        if (view.state) {
          this.decorations = this.buildDecorations(view);
          view.requestMeasure();
          this.scheduleUpdate(view);
        }
      }, 5000); // Update every 5 seconds (for testing)
    }

    destroy(): void {
      if (this.updateTimer !== null) {
        window.clearTimeout(this.updateTimer);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      // Return empty decoration set if task aging is disabled
      if (!isTaskAgingEnabled()) {
        return Decoration.none;
      }

      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc;

      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const taskMatch = line.text.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);

        if (taskMatch?.[2] === " ") {
          // Only incomplete tasks
          const indentLevel = taskMatch[1]?.length ?? 0;
          const taskContent = taskMatch[3]?.trim() ?? "";
          const taskKey = createTaskKey(taskContent, indentLevel, i);

          // Register creation time for new tasks
          registerTaskCreation(taskKey, taskContent, indentLevel);

          const createdAt = getTaskCreationTimes()[taskKey];
          if (createdAt && isValidISOString(createdAt)) {
            const opacity = calculateTaskOpacity(createdAt);

            const decoration = Decoration.line({
              attributes: {
                style: `opacity: ${opacity}; transition: opacity 0.3s ease-in-out;`,
                class: "cm-task-aging",
              },
            });
            builder.add(line.from, line.from, decoration);
          }
        }
      }

      return builder.finish();
    }

    // Clean up entries for tasks that no longer exist
    cleanupOldTasks(view: EditorView): void {
      const currentTaskKeys = new Set<TaskKey>();
      const doc = view.state.doc;

      // Collect keys for currently existing tasks
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const taskMatch = line.text.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);
        if (taskMatch?.[2] === " ") {
          const indentLevel = taskMatch[1]?.length ?? 0;
          const taskContent = taskMatch[3]?.trim() ?? "";
          const taskKey = createTaskKey(taskContent, indentLevel, i);
          currentTaskKeys.add(taskKey);
        }
      }

      // Create new object with only existing tasks
      const taskCreationTimes = getTaskCreationTimes();
      const filteredTimes = Object.fromEntries(
        Object.entries(taskCreationTimes).filter(([key]) => 
          currentTaskKeys.has(key as TaskKey)
        )
      ) as Record<TaskKey, ISOString>;

      // Persist changes if any deletions occurred
      if (Object.keys(filteredTimes).length !== Object.keys(taskCreationTimes).length) {
        setTaskCreationTimes(filteredTimes);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
