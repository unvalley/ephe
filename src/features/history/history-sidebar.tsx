import { useState } from "react";
import type { Snapshot } from "../snapshots/snapshot-storage";
import type { CompletedTask } from "../editor/tasks/task-storage";
import { HistoryIcon } from "../../utils/components/icons";
import { useHistoryData } from "./use-history-data";

type HistoryTabType = "snapshot" | "task";

// Helper function to truncate text
const truncateText = (text: string, maxLength = 60): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Component for the trash icon
const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="h-4 w-4 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <title>Delete</title>
    <path
      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Component for the restore icon
const RestoreIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="h-4 w-4 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <title>Restore</title>
    <path
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Component for the document icon
const DocumentIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4 flex-shrink-0 text-blue-500 dark:text-blue-400"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <title>Document</title>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// Component for the completed task icon
const CheckIcon = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4 flex-shrink-0 text-green-500 dark:text-green-400"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <title>Completed task</title>
    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z" />
  </svg>
);

export const HistorySidebar = () => {
  const [activeTab, setActiveTab] = useState<HistoryTabType>("snapshot");
  const {
    snapshots,
    tasks,
    groupedSnapshots,
    groupedTasks,
    isLoading,
    handleRestoreSnapshot,
    handleDeleteSnapshot,
    handleDeleteTask,
  } = useHistoryData();

  // Format date to display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format date for section header
  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Render snapshot item
  const renderSnapshotItem = (snapshot: Snapshot) => (
    <div
      key={snapshot.id}
      className="rounded-md border border-gray-200 bg-mono-50 p-2 dark:border-gray-700 dark:bg-mono-800"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">
            <DocumentIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm">{truncateText(snapshot.title, 40)}</div>
            <div className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">
              {formatDate(snapshot.timestamp)} • {snapshot.charCount.toLocaleString()} chars
            </div>
            {snapshot.description && (
              <div className="mt-1 line-clamp-1 text-gray-600 text-xs dark:text-gray-400">{snapshot.description}</div>
            )}
          </div>
        </div>
        <div className="ml-2 flex flex-shrink-0 gap-2">
          <button
            onClick={() => handleRestoreSnapshot(snapshot)}
            aria-label="Restore snapshot"
            className="flex items-center justify-center"
            title="Restore"
            type="button"
          >
            <RestoreIcon />
          </button>
          <button
            onClick={() => handleDeleteSnapshot(snapshot.id)}
            aria-label="Delete snapshot"
            className="flex items-center justify-center"
            title="Delete"
            type="button"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );

  // Render task item
  const renderTaskItem = (task: CompletedTask) => (
    <div
      key={task.id}
      className="rounded-md border border-gray-200 bg-mono-50 p-2 dark:border-gray-700 dark:bg-mono-800"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">
            <CheckIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm">{truncateText(task.content, 60)}</div>
            <div className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">
              {formatDate(task.completedAt)} {task.section && `• ${task.section}`}
            </div>
          </div>
        </div>
        <button
          onClick={() => handleDeleteTask(task.id)}
          aria-label="Delete task"
          className="ml-2 flex flex-shrink-0 items-center justify-center"
          title="Delete"
          type="button"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );

  // Render date section header
  const renderDateHeader = (title: string) => (
    <div className="-mx-2 sticky top-0 z-10 mb-2 bg-white px-2 py-1 dark:bg-mono-900">
      <h3 className="font-medium text-gray-500 text-xs dark:text-gray-400">{title}</h3>
    </div>
  );

  // Render snapshot list
  const renderSnapshotList = () => {
    if (snapshots.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-4 text-center">
          <svg
            aria-hidden="true"
            className="h-12 w-12 text-gray-400 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>No snapshots</title>
            <path
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
            />
          </svg>
          <p className="mt-2 text-gray-600 text-sm dark:text-gray-400">No snapshots found</p>
          <p className="text-gray-500 text-xs dark:text-gray-500">Save your progress to create snapshots</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Today's snapshots */}
        {groupedSnapshots.today.length > 0 && (
          <div>
            {renderDateHeader("Today")}
            <div className="space-y-2">{groupedSnapshots.today.map(renderSnapshotItem)}</div>
          </div>
        )}

        {/* Yesterday's snapshots */}
        {groupedSnapshots.yesterday.length > 0 && (
          <div>
            {renderDateHeader("Yesterday")}
            <div className="space-y-2">{groupedSnapshots.yesterday.map(renderSnapshotItem)}</div>
          </div>
        )}

        {/* Older snapshots grouped by date */}
        {groupedSnapshots.older.map((group) => (
          <div key={group.date}>
            {renderDateHeader(formatDateHeader(group.date))}
            <div className="space-y-2">{group.items.map(renderSnapshotItem)}</div>
          </div>
        ))}
      </div>
    );
  };

  // Render task list
  const renderTaskList = () => {
    if (tasks.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-4 text-center">
          <svg
            aria-hidden="true"
            className="h-12 w-12 text-gray-400 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>No tasks</title>
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
            />
          </svg>
          <p className="mt-2 text-gray-600 text-sm dark:text-gray-400">No completed tasks found</p>
          <p className="text-gray-500 text-xs dark:text-gray-500">Complete tasks in your document to see them here</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Today's tasks */}
        {groupedTasks.today.length > 0 && (
          <div>
            {renderDateHeader("Today")}
            <div className="space-y-2">{groupedTasks.today.map(renderTaskItem)}</div>
          </div>
        )}

        {/* Yesterday's tasks */}
        {groupedTasks.yesterday.length > 0 && (
          <div>
            {renderDateHeader("Yesterday")}
            <div className="space-y-2">{groupedTasks.yesterday.map(renderTaskItem)}</div>
          </div>
        )}

        {/* Older tasks grouped by date */}
        {groupedTasks.older.map((group) => (
          <div key={group.date}>
            {renderDateHeader(formatDateHeader(group.date))}
            <div className="space-y-2">{group.items.map(renderTaskItem)}</div>
          </div>
        ))}
      </div>
    );
  };

  // Render content based on active tab
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-primary-500 border-b-2" />
        </div>
      );
    }

    return activeTab === "snapshot" ? renderSnapshotList() : renderTaskList();
  };

  return (
    <div className="flex h-full w-[300px] flex-col border-gray-200 border-l bg-white dark:border-gray-700 dark:bg-mono-900">
      {/* Header */}
      <div className="flex items-center justify-between border-gray-200 border-b p-2 dark:border-gray-700">
        <div className="flex items-center">
          <span className="mr-2">
            <HistoryIcon />
          </span>
          <h2 className="font-medium text-sm">History</h2>
        </div>

        <div className="text-gray-500 text-xs dark:text-gray-400">
          {!isLoading && (
            <span>
              {activeTab === "snapshot"
                ? `${snapshots.length} snapshot${snapshots.length !== 1 ? "s" : ""}`
                : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-gray-200 border-b dark:border-gray-700">
        <nav aria-label="History tabs" className="flex space-x-2">
          <button
            onClick={() => setActiveTab("snapshot")}
            className={`px-3 py-2 font-medium text-sm ${
              activeTab === "snapshot"
                ? "border-primary-500 border-b-2 text-primary-600 dark:text-primary-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            type="button"
          >
            Snapshots
          </button>
          <button
            onClick={() => setActiveTab("task")}
            className={`px-3 py-2 font-medium text-sm ${
              activeTab === "task"
                ? "border-primary-500 border-b-2 text-primary-600 dark:text-primary-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            type="button"
          >
            Tasks
          </button>
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-2">{renderContent()}</div>
    </div>
  );
};
