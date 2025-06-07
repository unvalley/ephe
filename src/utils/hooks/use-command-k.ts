import { useState, useEffect, useCallback } from "react";

export const useCommandK = () => {
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  const toggleCommandMenu = useCallback(() => {
    setIsCommandMenuOpen((prev) => !prev);
  }, []);

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

  return { isCommandMenuOpen, toggleCommandMenu, closeCommandMenu };
};
