import { Fragment, useState, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { useHistoryData } from "./use-history-data";
import { type Snapshot } from "../snapshots/snapshot-storage";

export type HistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTabIndex?: number;
};

export const HistoryModal = ({ isOpen, onClose, initialTabIndex = 0 }: HistoryModalProps) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(initialTabIndex);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const { snapshots, tasks, isLoading, handleRestoreSnapshot, handleDeleteSnapshot } = useHistoryData();

  // Update selected tab when initialTabIndex changes
  useEffect(() => {
    setSelectedTabIndex(initialTabIndex);
  }, [initialTabIndex]);

  // Load data when modal opens
  if (isOpen && snapshots.length > 0 && !selectedSnapshot) {
    setSelectedSnapshot(snapshots[0]);
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Handle snapshot click
  const handleSnapshotClick = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
  };

  // Handle keydown for accessibility
  const handleKeyDown = (e: React.KeyboardEvent, snapshot: Snapshot) => {
    if (e.key === "Enter" || e.key === " ") {
      handleSnapshotClick(snapshot);
    }
  };

  // Handle restore snapshot
  const handleRestore = () => {
    if (selectedSnapshot) {
      handleRestoreSnapshot(selectedSnapshot);
      onClose();
    }
  };

  // Handle delete snapshot
  const handleDelete = () => {
    if (selectedSnapshot && confirm("Are you sure you want to delete this snapshot?")) {
      handleDeleteSnapshot(selectedSnapshot.id);

      // Select a new snapshot if available
      if (snapshots.length > 1) {
        const newSelectedIndex = snapshots.findIndex((s) => s.id === selectedSnapshot.id);
        const nextIndex = newSelectedIndex === 0 ? 1 : newSelectedIndex - 1;
        setSelectedSnapshot(snapshots[nextIndex >= 0 ? nextIndex : 0]);
      } else {
        setSelectedSnapshot(null);
      }
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* Semi-transparent backdrop */}
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-5xl transform overflow-hidden rounded-md bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-neutral-800">
                <div className="mt-4">
                  <TabGroup selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
                    <TabList className="flex space-x-1">
                      <Tab
                        className={({ selected }) =>
                          `rounded-md px-2 py-1 transition-colors ${selected ? "" : "text-neutral-300 dark:text-neutral-500"}`
                        }
                      >
                        Tasks
                      </Tab>
                      <div className="flex items-center text-gray-400 dark:text-gray-500">/</div>
                      <Tab
                        className={({ selected }) =>
                          `rounded-md px-2 py-1 transition-colors ${selected ? "" : "text-neutral-300 dark:text-neutral-500"}`
                        }
                      >
                        Snapshots
                      </Tab>
                    </TabList>
                    <TabPanels className="mt-2">
                      {/* Tasks Panel */}
                      <TabPanel className="p-3">
                        <div className="h-[60vh] overflow-y-auto">
                          {isLoading ? (
                            <div className="flex h-full items-center justify-center">
                              <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading tasks...</div>
                            </div>
                          ) : tasks.length > 0 ? (
                            <div className="divide-y divide-gray-200 dark:divide-gray-600">
                              {tasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between py-3">
                                  <div className="flex items-center">
                                    <span className="mr-2 text-gray-800 dark:text-gray-400">[x]</span>
                                    <span className="text-gray-800 dark:text-gray-400">{task.content}</span>
                                  </div>
                                  <span className="text-gray-500 text-sm dark:text-gray-400">
                                    Closed at {formatDate(task.completedAt)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                                No tasks found.
                                <p>You can open tasks by `- [ ]`, and can close them by `- [x]`.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabPanel>
                      {/* Snapshots Panel with Split View */}
                      <TabPanel className="p-3">
                        <div className="flex h-[60vh]">
                          {/* Main content - Left side */}
                          <div className="flex-1 overflow-y-auto border-gray-200 border-r pr-4 dark:border-gray-600">
                            {snapshots.length === 0 ? (
                              <div className="flex h-full items-center justify-center">
                                <div className="text-center text-gray-500 dark:text-gray-400">
                                  No snapshots found.
                                  <br />
                                  You can save a snapshot by{" "}
                                  <kbd className="rounded-md border border-gray-200 bg-gray-100 px-1 py-0.5 font-medium text-gray-800 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                                    Cmd + s
                                  </kbd>{" "}
                                  on the editor.
                                </div>
                              </div>
                            ) : isLoading ? (
                              <div className="flex h-full items-center justify-center">
                                <div className="text-center text-gray-500 dark:text-gray-400">Loading snapshots...</div>
                              </div>
                            ) : selectedSnapshot ? (
                              <div className="flex h-full flex-col">
                                <div className="mb-4 flex items-center justify-between">
                                  <h4 className="text-md">{formatDate(selectedSnapshot.timestamp)}</h4>
                                  <div className="flex space-x-2">
                                    <button
                                      type="button"
                                      onClick={handleRestore}
                                      className="rounded bg-primary-100 px-3 py-1.5 text-primary-700 text-sm hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleDelete}
                                      className="rounded bg-red-100 px-3 py-1.5 text-red-700 text-sm hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none flex-1 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-mono-600">
                                  {selectedSnapshot.content.split("\n").map((line, i) => (
                                    <div
                                      key={`line-${selectedSnapshot.id}-${i}`}
                                      className={line.trim() === "" ? "h-4" : ""}
                                    >
                                      {line}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <div className="text-center text-gray-500 dark:text-gray-400">No snapshot selected</div>
                              </div>
                            )}
                          </div>
                          {snapshots.length > 0 && (
                            <div className="w-1/4 overflow-y-auto pl-4">
                              {isLoading ? (
                                <div className="py-10 text-center text-gray-500 dark:text-gray-400">Loading...</div>
                              ) : (
                                <div className="divide-y divide-gray-200 dark:divide-gray-600">
                                  {snapshots.map((snapshot) => (
                                    <button
                                      key={snapshot.id}
                                      className={`w-full cursor-pointer px-2 py-3 text-left transition-colors ${
                                        selectedSnapshot?.id === snapshot.id
                                          ? "bg-primary-100 dark:bg-primary-900/20"
                                          : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                      }`}
                                      onClick={() => handleSnapshotClick(snapshot)}
                                      onKeyDown={(e) => handleKeyDown(e, snapshot)}
                                      aria-label={`Select snapshot: ${formatDate(snapshot.timestamp)}`}
                                      type="button"
                                    >
                                      <div className="flex flex-col">
                                        <h5 className="truncate text-sm">{formatDate(snapshot.timestamp)}</h5>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </TabPanel>
                    </TabPanels>
                  </TabGroup>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="rounded border border-transparent bg-primary-100 px-4 py-2 text-primary-900 text-sm hover:bg-primary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
