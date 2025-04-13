"use client";

import { useEffect, useState } from "react";

type AlreadyOpenDialogProps = {
  shouldShowAlert: boolean;
  onContinue: () => void;
};

export const AlreadyOpenDialog = ({ shouldShowAlert: isOpen, onContinue }: AlreadyOpenDialogProps) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // Handle animation visibility
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Hide dialog when not visible
  if (!isOpen && !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
    >
      <dialog
        open={isOpen}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4 transition-all duration-300 ${
          isOpen ? "transform-none" : "transform scale-95"
        } fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 m-0 border-none`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-labelledby="dialog-title"
      >
        <h2 id="dialog-title" className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          App Already Open
        </h2>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          The app is already open in another tab or window. Editing in multiple tabs simultaneously may lead to
          conflicts or data loss.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn-primary px-4 py-2"
            onClick={onContinue}
            aria-label="Continue without synchronization"
          >
            Continue Anyway
          </button>
        </div>
      </dialog>
    </div>
  );
};
