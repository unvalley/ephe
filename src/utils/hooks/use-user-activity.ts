import { useState, useEffect, useRef } from "react";

type UseUserActivityOptions = {
  showDelay?: number;
};

export const useUserActivity = (options: UseUserActivityOptions = {}) => {
  const { showDelay = 1000 } = options;
  const [isTyping, setIsTyping] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);

  const handleTypingStart = () => {
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleTypingEnd = () => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
    }, showDelay);
  };

  const handleScrolling = () => {
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, showDelay);
  };

  useEffect(() => {
    const handleKeyDown = () => handleTypingStart();
    const handleKeyUp = () => handleTypingEnd();
    const handleScroll = () => handleScrolling();

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("scroll", handleScroll, true);

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const isActive = isTyping || isScrolling;

  return {
    isActive,
    isHidden: isActive,
    isTyping,
    isScrolling,
  };
};
