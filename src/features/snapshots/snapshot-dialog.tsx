import { useState, useEffect } from "react";
import { showToast } from "../../utils/components/toast";
import { saveSnapshot } from "./snapshot-storage";

type SnapshotDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  editorContent: string;
};

export const SnapshotDialog = ({ isOpen, onClose, editorContent }: SnapshotDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    saveSnapshot({
      content: editorContent,
      title,
      description,
      charCount: editorContent.length,
    });

    showToast("Snapshot created successfully", "success");

    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h3 className="mb-3 font-medium text-gray-900 text-lg dark:text-gray-100">Create Snapshot</h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="snapshot-title" className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
              Title
            </label>
            <input
              id="snapshot-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="snapshot-description"
              className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300"
            >
              Description (optional)
            </label>
            <textarea
              id="snapshot-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              rows={3}
            />
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Create Snapshot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
