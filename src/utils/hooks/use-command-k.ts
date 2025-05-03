import { useState, useEffect } from "react";

export const useCommandK = () => {
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  const toggleCommandMenu = () => {
    setIsCommandMenuOpen((prev) => !prev);
  };

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

  return { isCommandMenuOpen, toggleCommandMenu };
};
