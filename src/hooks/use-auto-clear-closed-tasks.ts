import { useEffect, useRef, useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";
import { LOCAL_STORAGE_KEYS } from "../utils/constants";
import { editor, Range } from "monaco-editor";
import { markdownService } from "../features/editor/markdown/ast/markdown-service";
import { showToast } from "../components/toast";

export type AutoClearMode = "disabled" | "immediate" | "hourly" | "daily";

export type TaskToRemove = {
  taskLine: number;
  completedAt: Date;
};

/**
 * Auto-clear closed tasks
 *
 * Supports 3 modes:
 * - immediate: Delete task immediately
 * - hourly: Delete task after 1 hour
 * - daily: Delete task when the date changes
 */
export const useAutoClearClosedTasks = (editorRef?: React.RefObject<editor.IStandaloneCodeEditor | null>) => {
  const [autoClearMode, setAutoClearMode] = useLocalStorage<AutoClearMode>(
    LOCAL_STORAGE_KEYS.AUTO_CLEAR_CLOSED_TASKS,
    "disabled",
  );

  // 保留中のタスクを追跡するためのMap
  const pendingTasksRef = useRef<Map<number, TaskToRemove>>(new Map());

  // タイマーの参照
  const timerIdRef = useRef<number | null>(null);

  /**
   * Delete a task from the editor
   */
  const clearTaskFromEditor = useCallback((editor: editor.IStandaloneCodeEditor, taskLine: number): boolean => {
    try {
      const model = editor.getModel();
      if (!model) return false;

      // Check if the next line is an empty line (to delete the empty line as well)
      let nextLineNumber = taskLine + 1;
      let nextLineEmpty = false;

      if (nextLineNumber <= model.getLineCount()) {
        const nextLineContent = model.getLineContent(nextLineNumber);
        nextLineEmpty = nextLineContent.trim() === "";
      }

      const deleteRange = new Range(
        taskLine,
        1,
        nextLineEmpty ? nextLineNumber : taskLine,
        nextLineEmpty ? 1 : model.getLineMaxColumn(taskLine),
      );

      editor.executeEdits("auto-clear-closed-tasks", [{ range: deleteRange, text: "" }]);

      pendingTasksRef.current.delete(taskLine);
      return true;
    } catch (error) {
      console.error("Error clearing task from editor:", error);
      return false;
    }
  }, []);

  /**
   * 保留中のタスクの中から、現在削除すべきタスクを見つけて削除する
   */
  const processPendingTasks = useCallback(() => {
    if (autoClearMode === "disabled" || !editorRef?.current || pendingTasksRef.current.size === 0) {
      return false;
    }

    const editor = editorRef.current;
    const now = new Date();
    const tasksToRemove: number[] = [];

    // 削除条件を満たすタスクを見つける
    pendingTasksRef.current.forEach((task, taskLine) => {
      let shouldClear = false;

      if (autoClearMode === "hourly") {
        // 1時間経過したかチェック
        const hourLater = new Date(task.completedAt);
        hourLater.setHours(hourLater.getHours() + 1);
        shouldClear = now >= hourLater;
      } else if (autoClearMode === "daily") {
        // 日付が変わったかチェック
        const taskDate = task.completedAt.toDateString();
        const currentDate = now.toDateString();
        shouldClear = taskDate !== currentDate;
      }

      if (shouldClear) {
        tasksToRemove.push(taskLine);
      }
    });

    // 削除すべきタスクがあれば削除する
    if (tasksToRemove.length > 0) {
      let clearedCount = 0;

      tasksToRemove.forEach((taskLine) => {
        if (clearTaskFromEditor(editor, taskLine)) {
          clearedCount++;
        }
      });

      if (clearedCount > 0) {
        showToast(
          `${clearedCount} completed ${clearedCount === 1 ? "task" : "tasks"} automatically cleared`,
          "default",
        );
      }

      return true;
    }

    return false;
  }, [autoClearMode, editorRef, clearTaskFromEditor]);

  /**
   * 次のタスク削除処理のタイマーをスケジュールする
   */
  const scheduleNextCheck = useCallback(() => {
    // 既存のタイマーをクリア
    if (timerIdRef.current !== null) {
      window.clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }

    if (autoClearMode === "disabled" || !editorRef?.current || pendingTasksRef.current.size === 0) {
      return;
    }

    const now = new Date();
    let nextCheckTime: Date | null = null;

    if (autoClearMode === "hourly") {
      // 一番早く1時間に達するタスクを見つける
      pendingTasksRef.current.forEach((task) => {
        const hourLater = new Date(task.completedAt);
        hourLater.setHours(hourLater.getHours() + 1);

        if (hourLater > now && (!nextCheckTime || hourLater < nextCheckTime)) {
          nextCheckTime = hourLater;
        }
      });
    } else if (autoClearMode === "daily") {
      // 次の日の0時を計算
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      nextCheckTime = tomorrow;
    }

    // 次の処理時間が決まったらタイマーをセット
    if (nextCheckTime) {
      const delay = Math.max(nextCheckTime.getTime() - now.getTime(), 100);

      timerIdRef.current = window.setTimeout(() => {
        processPendingTasks();
        // 次のチェックをスケジュール
        scheduleNextCheck();
      }, delay);
    }
  }, [autoClearMode, editorRef, processPendingTasks]);

  /**
   * Process completed tasks
   */
  const handleTaskChecked = useCallback(
    (taskLine: number) => {
      if (autoClearMode === "disabled" || !editorRef?.current) return;

      const editor = editorRef.current;
      const now = new Date();

      // Record the task completion time
      markdownService.recordCompletedTask(taskLine, now);

      // If the mode is immediate, delete the task immediately
      if (autoClearMode === "immediate") {
        if (clearTaskFromEditor(editor, taskLine)) {
          showToast("Completed task automatically cleared", "default");
        }
      } else {
        // Register the task to be deleted later
        pendingTasksRef.current.set(taskLine, {
          taskLine,
          completedAt: now,
        });

        // Schedule the next deletion time
        scheduleNextCheck();
      }
    },
    [autoClearMode, editorRef, clearTaskFromEditor, scheduleNextCheck],
  );

  /**
   * 完了済みタスクの処理（メインのロジック）
   */
  const processCompletedTasks = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      if (autoClearMode === "disabled") return;

      try {
        const model = editor.getModel();
        if (!model) return;

        // エディタの内容からチェック済みタスクを見つける
        const content = model.getValue();
        const ast = markdownService.getAst(content);
        const tasksWithTimestamps = markdownService.findCompletedTasksWithTimestamps(ast);

        // 完了済みタスクを処理
        let tasksUpdated = false;

        tasksWithTimestamps.forEach((task) => {
          if (!task.checked) return;

          if (autoClearMode === "immediate") {
            // 即時モードではすぐに削除
            if (clearTaskFromEditor(editor, task.line)) {
              tasksUpdated = true;
            }
          } else {
            // 他のモードでは後で削除するためにタスクを登録
            pendingTasksRef.current.set(task.line, {
              taskLine: task.line,
              completedAt: task.completedAt,
            });
            tasksUpdated = true;
          }
        });

        // 何か更新があれば次のチェックをスケジュール
        if (tasksUpdated && autoClearMode !== "immediate") {
          // 即時処理を試みる（条件が既に満たされているタスクがあるかもしれない）
          const processed = processPendingTasks();

          // 処理されなかったタスクがある場合は次のチェックをスケジュール
          if (!processed && pendingTasksRef.current.size > 0) {
            scheduleNextCheck();
          }
        }
      } catch (error) {
        console.error("Error processing completed tasks:", error);
      }
    },
    [autoClearMode, clearTaskFromEditor, processPendingTasks, scheduleNextCheck],
  );

  // モード変更時の処理
  useEffect(() => {
    // タイマーをクリア
    if (timerIdRef.current !== null) {
      window.clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }

    // 無効モードならここで終了
    if (autoClearMode === "disabled" || !editorRef?.current) {
      return;
    }

    // エディタの内容を処理
    const editor = editorRef.current;
    processCompletedTasks(editor);

    return () => {
      if (timerIdRef.current !== null) {
        window.clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [autoClearMode, editorRef, processCompletedTasks]);

  return {
    autoClearMode,
    setAutoClearMode,
    processCompletedTasks,
    handleTaskChecked,
  };
};
