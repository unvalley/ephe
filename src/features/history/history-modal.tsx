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
import { Fragment, useEffect, useState } from "react";
import type { Snapshot } from "../snapshots/snapshot-storage";
import { useHistoryData } from "./use-history-data";

type HistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTabIndex?: number;
};

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

const BUTTON_STYLES = {
  primary:
    "rounded border border-transparent bg-neutral-100 px-4 py-2 text-sm transition-colors hover:bg-neutral-200 focus-visible:ring-offset-2 dark:bg-neutral-700/50 dark:hover:bg-neutral-600",
  danger:
    "rounded bg-red-100 px-3 py-1.5 text-red-700 text-sm hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50",
  close:
    "rounded border border-transparent bg-neutral-100 px-4 py-2 text-sm transition-colors hover:bg-neutral-200 focus-visible:ring-offset-2 dark:bg-neutral-700 dark:hover:bg-neutral-600",
} as const;

export const HistoryModal = ({ isOpen, onClose, initialTabIndex = 0 }: HistoryModalProps) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(initialTabIndex);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const {
    snapshots,
    tasks,
    isLoading,
    handleRestoreSnapshot,
    handleDeleteSnapshot,
    handleDeleteAllSnapshots,
    refresh,
  } = useHistoryData();

  useEffect(() => {
    setSelectedTabIndex(initialTabIndex);
  }, [initialTabIndex]);

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen, refresh]);

  useEffect(() => {
    if (isOpen && snapshots.length > 0 && !selectedSnapshot) {
      setSelectedSnapshot(snapshots[0]);
    }
  }, [isOpen, snapshots, selectedSnapshot]);

  const handleSnapshotClick = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
  };

  const handleKeyDown = (e: React.KeyboardEvent, snapshot: Snapshot) => {
    if (e.key === "Enter" || e.key === " ") {
      handleSnapshotClick(snapshot);
    }
  };

  const handleRestore = () => {
    if (selectedSnapshot) {
      handleRestoreSnapshot(selectedSnapshot);
      onClose();
    }
  };

  const handleDelete = () => {
    if (selectedSnapshot && confirm("Are you sure you want to delete this snapshot?")) {
      handleDeleteSnapshot(selectedSnapshot.id);

      if (snapshots.length > 1) {
        const newSelectedIndex = snapshots.findIndex((s) => s.id === selectedSnapshot.id);
        const nextIndex = newSelectedIndex === 0 ? 1 : newSelectedIndex - 1;
        setSelectedSnapshot(snapshots[nextIndex >= 0 ? nextIndex : 0]);
      } else {
        setSelectedSnapshot(null);
      }
    }
  };

  const handleDeleteAll = () => {
    if (
      snapshots.length > 0 &&
      confirm("Are you sure you want to delete all snapshots? This action cannot be undone.")
    ) {
      handleDeleteAllSnapshots();
      setSelectedSnapshot(null);
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
                      <div className="flex items-center text-neutral-400 dark:text-neutral-500">/</div>
                      <Tab
                        className={({ selected }) =>
                          `rounded-md px-2 py-1 transition-colors ${selected ? "" : "text-neutral-300 dark:text-neutral-500"}`
                        }
                      >
                        Snapshots
                      </Tab>
                    </TabList>
                    <TabPanels className="mt-2">
                      <TabPanel className="p-3">
                        <div className="h-[60vh] overflow-y-auto">
                          {isLoading ? (
                            <div className="flex h-full items-center justify-center">
                              <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">
                                Loading tasks...
                              </div>
                            </div>
                          ) : tasks.length > 0 ? (
                            <div className="divide-y divide-neutral-200 dark:divide-neutral-600">
                              {tasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between py-3">
                                  <div className="flex items-center">
                                    <span className="mr-2 text-neutral-500 dark:text-neutral-400">[x]</span>
                                    <span className="mr-1">{task.content}</span>
                                    {task.section && (
                                      <span className="text-neutral-500 text-sm dark:text-neutral-400">
                                        {task.section}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-neutral-500 text-sm dark:text-neutral-400">
                                    Closed at {formatDate(task.completedAt)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">
                                No tasks found.
                                <p>You can open tasks by `- [ ]`, and can close them by `- [x]`.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabPanel>
                      <TabPanel className="p-3">
                        {snapshots.length > 0 && (
                          <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-medium text-lg">Snapshots</h3>
                            <button type="button" onClick={handleDeleteAll} className={BUTTON_STYLES.danger}>
                              Delete All
                            </button>
                          </div>
                        )}
                        <div className="flex h-[60vh]">
                          <div className="flex-1 overflow-y-auto border-neutral-200 border-r pr-4 dark:border-neutral-600">
                            {snapshots.length === 0 ? (
                              <div className="flex h-full items-center justify-center">
                                <div className="text-center text-neutral-500 dark:text-neutral-400">
                                  No snapshots found.
                                  <br />
                                  You can save a snapshot by{" "}
                                  <kbd className="rounded-md border border-neutral-200 bg-neutral-100 px-1 py-0.5 font-medium text-neutral-800 text-xs dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
                                    Cmd + Shift + s
                                  </kbd>{" "}
                                  on the editor.
                                </div>
                              </div>
                            ) : isLoading ? (
                              <div className="flex h-full items-center justify-center">
                                <div className="text-center text-neutral-500 dark:text-neutral-400">
                                  Loading snapshots...
                                </div>
                              </div>
                            ) : selectedSnapshot ? (
                              <div className="flex h-full flex-col">
                                <div className="mb-4 flex items-center justify-between">
                                  <h4 className="text-md">{formatDate(selectedSnapshot.timestamp)}</h4>
                                  <div className="flex space-x-2">
                                    <button type="button" onClick={handleRestore} className={BUTTON_STYLES.primary}>
                                      Restore
                                    </button>
                                    <button type="button" onClick={handleDelete} className={BUTTON_STYLES.danger}>
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none flex-1 overflow-y-auto rounded border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-600 dark:bg-primary-600">
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
                                <div className="text-center text-neutral-500 dark:text-neutral-400">
                                  No snapshot selected
                                </div>
                              </div>
                            )}
                          </div>
                          {snapshots.length > 0 && (
                            <div className="w-1/4 overflow-y-auto pl-4">
                              {isLoading ? (
                                <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">
                                  Loading...
                                </div>
                              ) : (
                                <div className="divide-y divide-neutral-200 dark:divide-neutral-600">
                                  {snapshots.map((snapshot) => (
                                    <button
                                      key={snapshot.id}
                                      className={`w-full cursor-pointer px-2 py-3 text-left transition-colors ${
                                        selectedSnapshot?.id === snapshot.id
                                          ? "bg-neutral-100 dark:bg-neutral-700"
                                          : "hover:bg-neutral-50 dark:hover:bg-neutral-700/30"
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
                  <button type="button" className={BUTTON_STYLES.close} onClick={onClose}>
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
