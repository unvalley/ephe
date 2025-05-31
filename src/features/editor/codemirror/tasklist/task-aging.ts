import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

// Map to store task creation times
const taskCreationTimes = new Map<string, number>();

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

// Generate unique key from task content and position
const getTaskKey = (lineText: string, lineNumber: number, position: number): string => {
  const taskMatch = lineText.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);
  const content = taskMatch ? taskMatch[3].trim() : lineText.trim();
  return `${lineNumber}:${position}:${content}`;
};

// Register task creation time
export const registerTaskCreation = (taskKey: string): void => {
  if (!taskCreationTimes.has(taskKey)) {
    taskCreationTimes.set(taskKey, Date.now());
  }
};

// Task aging plugin
export const taskAgingPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    updateTimer: number | null = null;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
      this.scheduleUpdate(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        // Clean up old task entries when document changes
        this.cleanupOldTasks(update.view);
        this.decorations = this.buildDecorations(update.view);
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
          const taskKey = getTaskKey(line.text, i, line.from);

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
          const taskKey = getTaskKey(line.text, i, line.from);
          currentTaskKeys.add(taskKey);
        }
      }

      // Remove entries for non-existent tasks
      for (const key of taskCreationTimes.keys()) {
        if (!currentTaskKeys.has(key)) {
          taskCreationTimes.delete(key);
        }
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
