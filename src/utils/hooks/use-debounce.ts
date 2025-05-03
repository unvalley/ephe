import { useState, useEffect } from "react";

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes before the delay has passed
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

// biome-ignore lint/suspicious/noExplicitAny: accept any function
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Return a memoized version of the callback that only changes if fn or delay change
  return (...args: Parameters<T>) => {
    // Clear the previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set a new timeout
    const id = setTimeout(() => {
      fn(...args);
    }, delay);

    setTimeoutId(id);
  };
};
