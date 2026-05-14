import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

type UseUserActivityOptions = {
  showDelay?: number;
};

export const useUserActivity = (options: UseUserActivityOptions = {}) => {
  const { showDelay = 800 } = options;
  const [isTyping, setIsTyping] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const stopTyping = useDebouncedCallback(() => setIsTyping(false), showDelay);
  const stopScrolling = useDebouncedCallback(() => setIsScrolling(false), showDelay);

  useEffect(() => {
    // keyup is unreliable across tab/window switches (e.g. Cmd+Tab fires keydown
    // but the keyup may never reach this document), so debounce on keydown only
    // and clear state on focus loss / visibility change as a safety net.
    const handleKeyDown = () => {
      setIsTyping(true);
      stopTyping();
    };
    const handleScroll = () => {
      setIsScrolling(true);
      stopScrolling();
    };
    const handleReset = () => {
      stopTyping.cancel();
      stopScrolling.cancel();
      setIsTyping(false);
      setIsScrolling(false);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleReset();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleReset);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleReset);
    };
  }, [stopTyping, stopScrolling]);

  return {
    isHidden: isTyping || isScrolling,
    isTyping,
    isScrolling,
  };
};
