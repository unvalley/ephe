import { useState, useRef, useEffect } from "react";
import type { SnapshotHistoryItem } from "../features/history/history-types";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "../hooks/use-theme";
import { deleteHistoryItem } from "../features/history/history-storage";
import { EDITOR_CONTENT_KEY } from "../features/monaco";
import { useNavigate } from "react-router-dom";
import type * as monaco from "monaco-editor";
import { showToast } from "./toast";

interface SnapshotViewerProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: SnapshotHistoryItem | null;
}

export const SnapshotViewer = ({ isOpen, onClose, snapshot }: SnapshotViewerProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !snapshot) return null;

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    setIsLoading(false);
    editorRef.current = editor;
  };

  const formattedDate = new Date(snapshot.timestamp).toLocaleString();

  // スナップショットをファイルとしてエクスポートする関数
  const handleExport = () => {
    if (!snapshot) return;

    const blob = new Blob([snapshot.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    // ファイル名を生成（タイトルから無効な文字を削除）
    const fileName = `${snapshot.title.replace(/[/\\?%*:|"<>]/g, "-")}.md`;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();

    // クリーンアップ
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = () => {
    if (!snapshot) return;

    const currentContent = localStorage.getItem(EDITOR_CONTENT_KEY) || "";

    if (currentContent.trim().length > 0) {
      import("../features/history/snapshot-manager").then(({ createAutoSnapshot }) => {
        const now = new Date();
        const formattedDate = now.toLocaleString();
        createAutoSnapshot(
          currentContent,
          `Backup before restore - ${formattedDate}`,
          "Automatically created before restoring a snapshot",
          ["auto-backup"],
        );
      });
    }

    localStorage.setItem(EDITOR_CONTENT_KEY, snapshot.content);

    showToast("Snapshot content restored to editor", "success");
    navigate("/");
    onClose();
  };

  const handleDelete = () => {
    if (!snapshot) return;
    deleteHistoryItem(snapshot.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{snapshot.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formattedDate} • {snapshot.charCount.toLocaleString()} characters
            </p>
          </div>

          {snapshot.tags && snapshot.tags.length > 0 && (
            <div className="flex gap-1">
              {snapshot.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {snapshot.description && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">{snapshot.description}</p>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          )}

          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={snapshot.content}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              lineNumbers: "off",
              folding: true,
              lineDecorationsWidth: 0,
              glyphMargin: false,
              renderLineHighlight: "none",
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              overviewRulerLanes: 0,
              contextmenu: false,
              fontFamily: "'Space Mono', monospace",
              fontSize: 14,
              lineHeight: 1.6,
              padding: { top: 16, bottom: 16 },
            }}
            onMount={handleEditorDidMount}
            theme={isDarkMode ? "ephe-dark" : "ephe-light"}
          />
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <div className="flex space-x-2">
            <button
              onClick={handleRestore}
              className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Restore
            </button>

            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Export
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm rounded-md bg-gray-100 text-red-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-gray-600 transition-colors"
            >
              Delete
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
