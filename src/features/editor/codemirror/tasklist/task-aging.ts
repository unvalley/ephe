import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

// タスクの作成時間を保存するMap
const taskCreationTimes = new Map<string, number>();

// タスクの年齢に基づいて透明度を計算
const calculateTaskOpacity = (createdAt: number): number => {
  const now = Date.now();

  // テスト用に非常に短い時間で変化するようにする（1分以内）
  const ageInSeconds = (now - createdAt) / 1000; // 秒単位でテスト

  if (ageInSeconds <= 10) return 1.0; // 0-10秒: 完全な色
  if (ageInSeconds <= 20) return 0.8; // 10-20秒: 少し薄く
  if (ageInSeconds <= 40) return 0.6; // 20-40秒: より薄く
  return 0.4; // 40秒以上: かなり薄く
};

// タスクのコンテンツとポジションからユニークキーを生成
const getTaskKey = (lineText: string, lineNumber: number, position: number): string => {
  const taskMatch = lineText.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);
  const content = taskMatch ? taskMatch[3].trim() : lineText.trim();
  return `${lineNumber}:${position}:${content}`;
};

// タスクの作成時間を登録
const registerTaskCreation = (taskKey: string): void => {
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
        // ドキュメントが変更された場合、古いタスクエントリを削除
        this.cleanupOldTasks(update.view);
        this.decorations = this.buildDecorations(update.view);
      }
    }

    // 定期的に透明度を更新
    scheduleUpdate(view: EditorView) {
      this.updateTimer = window.setTimeout(() => {
        if (view.state) {
          this.decorations = this.buildDecorations(view);
          view.requestMeasure();
          this.scheduleUpdate(view);
        }
      }, 5000); // 5秒ごとに更新（テスト用）
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
          // 未完了タスクのみ
          const taskKey = getTaskKey(line.text, i, line.from);

          // 新しいタスクの場合は作成時間を登録
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

    // 現在存在しないタスクのエントリを削除
    cleanupOldTasks(view: EditorView) {
      const currentTaskKeys = new Set<string>();
      const doc = view.state.doc;

      // 現在存在するタスクのキーを収集
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const taskMatch = line.text.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);
        if (taskMatch && taskMatch[2] === " ") {
          const taskKey = getTaskKey(line.text, i, line.from);
          currentTaskKeys.add(taskKey);
        }
      }

      // 存在しないタスクのエントリを削除
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
