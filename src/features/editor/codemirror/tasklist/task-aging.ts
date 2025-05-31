import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { Text } from "@codemirror/state";
import { atomWithStorage } from "jotai/utils";
import { getDefaultStore } from "jotai";
import { LOCAL_STORAGE_KEYS } from "../../../../utils/constants";
import { taskAgingEnabledAtom } from "../../../../utils/hooks/use-task-aging";

// Task creation times storage using atomWithStorage
const taskCreationTimesAtom = atomWithStorage<Record<string, number>>(LOCAL_STORAGE_KEYS.TASK_AGING_TIMES, {});

const store = getDefaultStore();

// Get task creation times from atom
const getTaskCreationTimes = (): Record<string, number> => {
  return store.get(taskCreationTimesAtom);
};

// Set task creation times to atom
const setTaskCreationTimes = (times: Record<string, number>): void => {
  store.set(taskCreationTimesAtom, times);
};

// Get task aging enabled state from atom
const isTaskAgingEnabled = (): boolean => {
  return store.get(taskAgingEnabledAtom);
};

// Calculate task opacity based on age
const calculateTaskOpacity = (createdAt: number): number => {
  const now = Date.now();

  // For testing purposes, use very short time intervals (within 1 minute)
  const ageInSeconds = (now - createdAt) / 1000; // Test in seconds

  if (ageInSeconds <= 10) return 1.0; // 0-10 seconds: full color
  if (ageInSeconds <= 20) return 0.8; // 10-20 seconds: slightly faded
  if (ageInSeconds <= 40) return 0.6; // 20-40 seconds: more faded
  return 0.4; // 40+ seconds: quite faded
};

// Generate stable unique key from task content, indent level, and line number for uniqueness
const getTaskKey = (taskContent: string, indentLevel: number, lineNumber: number): string => {
  // Include line number for uniqueness while still allowing content-based migration
  return `${indentLevel}:${taskContent}:${lineNumber}`;
};

// Register task creation time
export const registerTaskCreation = (taskKey: string, taskContent: string, indentLevel: number): void => {
  const taskCreationTimes = getTaskCreationTimes();
  if (!taskCreationTimes[taskKey]) {
    // Try to migrate from existing task with same content first
    migrateTaskByContent(taskContent, indentLevel, taskKey);

    // If no migration happened, create new entry
    if (!taskCreationTimes[taskKey]) {
      const updatedTimes = getTaskCreationTimes();
      updatedTimes[taskKey] = Date.now();
      setTaskCreationTimes(updatedTimes);
    }
  }
};

// Reset task creation time (when task is edited)
const resetTaskCreation = (taskKey: string): void => {
  const taskCreationTimes = getTaskCreationTimes();
  taskCreationTimes[taskKey] = Date.now();
  setTaskCreationTimes(taskCreationTimes);
};

// Find and migrate task creation time based on content when task moves to different line
const migrateTaskByContent = (taskContent: string, indentLevel: number, newKey: string): void => {
  const taskCreationTimes = getTaskCreationTimes();

  // Look for existing keys with same content but different line numbers
  for (const [existingKey, timestamp] of Object.entries(taskCreationTimes)) {
    const keyParts = existingKey.split(":");
    if (keyParts.length === 3) {
      const existingIndent = parseInt(keyParts[0]);
      const existingContent = keyParts[1];

      if (existingIndent === indentLevel && existingContent === taskContent && existingKey !== newKey) {
        // Found matching content, migrate if new key doesn't exist
        if (!taskCreationTimes[newKey]) {
          taskCreationTimes[newKey] = timestamp;
          delete taskCreationTimes[existingKey];
          setTaskCreationTimes(taskCreationTimes);
          return; // Only migrate once
        }
      }
    }
  }
};

// Clean up old entries (older than 7 days) to prevent localStorage bloat
const cleanupOldEntries = (): void => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const taskCreationTimes = getTaskCreationTimes();
  let hasChanges = false;

  for (const [key, timestamp] of Object.entries(taskCreationTimes)) {
    if (timestamp < sevenDaysAgo) {
      delete taskCreationTimes[key];
      hasChanges = true;
    }
  }

  if (hasChanges) {
    setTaskCreationTimes(taskCreationTimes);
  }
};

// Initialize cleanup on module load
cleanupOldEntries();

// Task aging plugin
export const taskAgingPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    updateTimer: number | null = null;
    previousTasksMap = new Map<number, { content: string; indent: number; key: string }>();

    constructor(view: EditorView) {
      this.buildTasksMap(view.state.doc);
      this.decorations = this.buildDecorations(view);
      this.scheduleUpdate(view);
    }

    // Build a map of current tasks for comparison
    buildTasksMap(doc: Text) {
      this.previousTasksMap.clear();

      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const taskMatch = line.text.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);

        if (taskMatch && taskMatch[2] === " ") {
          const indentLevel = taskMatch[1].length;
          const taskContent = taskMatch[3].trim();
          const taskKey = getTaskKey(taskContent, indentLevel, i);

          this.previousTasksMap.set(i, {
            content: taskContent,
            indent: indentLevel,
            key: taskKey,
          });
        }
      }
    }

    update(update: ViewUpdate) {
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
    handleTaskUpdates(doc: Text) {
      const currentTasksMap = new Map<number, { content: string; indent: number; key: string }>();

      // Build current tasks map
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const taskMatch = line.text.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);

        if (taskMatch && taskMatch[2] === " ") {
          const indentLevel = taskMatch[1].length;
          const taskContent = taskMatch[3].trim();
          const taskKey = getTaskKey(taskContent, indentLevel, i);

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
    scheduleUpdate(view: EditorView) {
      this.updateTimer = window.setTimeout(() => {
        if (view.state) {
          this.decorations = this.buildDecorations(view);
          view.requestMeasure();
          this.scheduleUpdate(view);
        }
      }, 5000); // Update every 5 seconds (for testing)
    }

    destroy() {
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

        if (taskMatch && taskMatch[2] === " ") {
          // Only incomplete tasks
          const indentLevel = taskMatch[1].length;
          const taskContent = taskMatch[3].trim();
          const taskKey = getTaskKey(taskContent, indentLevel, i);

          // Register creation time for new tasks
          registerTaskCreation(taskKey, taskContent, indentLevel);

          const createdAt = getTaskCreationTimes()[taskKey];
          if (createdAt) {
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
    cleanupOldTasks(view: EditorView) {
      const currentTaskKeys = new Set<string>();
      const doc = view.state.doc;

      // Collect keys for currently existing tasks
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const taskMatch = line.text.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);
        if (taskMatch && taskMatch[2] === " ") {
          const indentLevel = taskMatch[1].length;
          const taskContent = taskMatch[3].trim();
          const taskKey = getTaskKey(taskContent, indentLevel, i);
          currentTaskKeys.add(taskKey);
        }
      }

      // Remove entries for non-existent tasks
      let hasChanges = false;
      const taskCreationTimes = getTaskCreationTimes();
      for (const key of Object.keys(taskCreationTimes)) {
        if (!currentTaskKeys.has(key)) {
          delete taskCreationTimes[key];
          hasChanges = true;
        }
      }

      // Persist changes if any deletions occurred
      if (hasChanges) {
        setTaskCreationTimes(taskCreationTimes);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
