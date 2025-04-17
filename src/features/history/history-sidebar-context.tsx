import { useState, useCallback } from "react";

export const useHistorySidebar = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleHistorySidebar = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return {
    isVisible,
    setIsVisible,
    toggleHistorySidebar,
  };
};
