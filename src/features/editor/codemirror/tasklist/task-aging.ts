import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { Text } from "@codemirror/state";

// Key for localStorage
const TASK_AGING_STORAGE_KEY = "ephe-task-aging-times";

// Map to store task creation times (in-memory cache)
const taskCreationTimes = new Map<string, number>();

// Load task creation times from localStorage
const loadTaskCreationTimes = (): void => {
  try {
    const stored = localStorage.getItem(TASK_AGING_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, number>;
      for (const [key, value] of Object.entries(parsed)) {
        taskCreationTimes.set(key, value);
      }
    }
  } catch (error) {
    console.warn("Failed to load task aging times from localStorage:", error);
  }
};

// Save task creation times to localStorage
const saveTaskCreationTimes = (): void => {
  try {
    const data = Object.fromEntries(taskCreationTimes);
    localStorage.setItem(TASK_AGING_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save task aging times to localStorage:", error);
  }
};

// Debounced save to avoid too frequent localStorage writes
let saveTimeout: number | null = null;
const debouncedSave = (): void => {
  if (saveTimeout !== null) {
    window.clearTimeout(saveTimeout);
  }
  saveTimeout = window.setTimeout(() => {
    saveTaskCreationTimes();
    saveTimeout = null;
  }, 1000); // Save after 1 second of inactivity
};

// Clean up old entries (older than 7 days) to prevent localStorage bloat
const cleanupOldEntries = (): void => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let hasChanges = false;

  for (const [key, timestamp] of taskCreationTimes.entries()) {
    if (timestamp < sevenDaysAgo) {
      taskCreationTimes.delete(key);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    saveTaskCreationTimes();
  }
};

// Initialize: load from localStorage on module load
loadTaskCreationTimes();
cleanupOldEntries();

// Ensure data is saved before page unload
window.addEventListener("beforeunload", () => {
  if (saveTimeout !== null) {
    window.clearTimeout(saveTimeout);
    saveTaskCreationTimes(); // Force immediate save on page unload
  }
});

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

// Generate stable unique key from task content and indent level (without line number for persistence)
const getTaskKey = (taskContent: string, indentLevel: number): string => {
  // Use content + indent for persistent identification
  // This avoids line number dependency which changes frequently
  return `${indentLevel}:${taskContent}`;
};

// Register task creation time
export const registerTaskCreation = (taskKey: string): void => {
  if (!taskCreationTimes.has(taskKey)) {
    taskCreationTimes.set(taskKey, Date.now());
    debouncedSave(); // Use debounced save for better performance
  }
};

// Reset task creation time (when task is edited)
const resetTaskCreation = (taskKey: string): void => {
  taskCreationTimes.set(taskKey, Date.now());
  debouncedSave(); // Use debounced save for better performance
};

// Migrate task creation time from old key to new key
const migrateTaskCreation = (oldKey: string, newKey: string): void => {
  const existingTime = taskCreationTimes.get(oldKey);
  if (existingTime && !taskCreationTimes.has(newKey)) {
    taskCreationTimes.set(newKey, existingTime);
    taskCreationTimes.delete(oldKey);
    debouncedSave(); // Use debounced save for better performance
  }
};

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
          const taskKey = getTaskKey(taskContent, indentLevel);

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
          const taskKey = getTaskKey(taskContent, indentLevel);

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
            migrateTaskCreation(previousTask.key, currentTask.key);
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
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc;

      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const taskMatch = line.text.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);

        if (taskMatch && taskMatch[2] === " ") {
          // Only incomplete tasks
          const indentLevel = taskMatch[1].length;
          const taskContent = taskMatch[3].trim();
          const taskKey = getTaskKey(taskContent, indentLevel);

          // Register creation time for new tasks
          registerTaskCreation(taskKey);

          const createdAt = taskCreationTimes.get(taskKey);
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
          const taskKey = getTaskKey(taskContent, indentLevel);
          currentTaskKeys.add(taskKey);
        }
      }

      // Remove entries for non-existent tasks
      let hasChanges = false;
      for (const key of taskCreationTimes.keys()) {
        if (!currentTaskKeys.has(key)) {
          taskCreationTimes.delete(key);
          hasChanges = true;
        }
      }

      // Persist changes if any deletions occurred
      if (hasChanges) {
        saveTaskCreationTimes();
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
