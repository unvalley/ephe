import { useState, useEffect, useCallback } from "react";

export const useCommandK = (isModalOpen?: boolean) => {
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  const toggleCommandMenu = useCallback(() => {
    // Don't open command menu if a modal is open
    if (isModalOpen) return;
    setIsCommandMenuOpen((prev) => !prev);
  }, [isModalOpen]);

  const closeCommandMenu = useCallback(() => {
    setIsCommandMenuOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        toggleCommandMenu();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleCommandMenu]);

  // Close command menu if modal opens
  useEffect(() => {
    if (isModalOpen && isCommandMenuOpen) {
      closeCommandMenu();
    }
  }, [isModalOpen, isCommandMenuOpen, closeCommandMenu]);

  return { isCommandMenuOpen, toggleCommandMenu, closeCommandMenu };
};
