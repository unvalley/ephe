import { useState, useRef, useEffect } from "react";
import type { Snapshot } from "./snapshot-types";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "../../utils/hooks/use-theme";
import { deleteSnapshot } from "./snapshot-storage";
import { LOCAL_STORAGE_KEYS } from "../../utils/constants";
import { useNavigate } from "react-router-dom";
import type * as monaco from "monaco-editor";
import { showToast } from "../../utils/components/toast";
import { Loading } from "../../utils/components/loading";

type SnapshotViewerProps = {
  isOpen: boolean;
  onClose: () => void;
  snapshot: Snapshot | null;
};

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

  // Export the snapshot as a file
  const handleExport = () => {
    if (!snapshot) return;

    const blob = new Blob([snapshot.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    const fileName = `${snapshot.title.replace(/[/\\?%*:|"<>]/g, "-")}.md`;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = () => {
    if (!snapshot) return;
    localStorage.setItem(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, snapshot.content);

    showToast("Snapshot restored", "success");
    navigate("/");
    onClose();
  };

  const handleDelete = () => {
    if (!snapshot) return;
    deleteSnapshot(snapshot.id);
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

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Close</title>
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
          {isLoading && <Loading className="h-full w-full flex items-center justify-center" />}

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
              fontFamily: "monospace",
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
              type="button"
            >
              Restore
            </button>

            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
              type="button"
            >
              Export
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm rounded-md bg-gray-100 text-red-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-gray-600 transition-colors"
              type="button"
            >
              Delete
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
