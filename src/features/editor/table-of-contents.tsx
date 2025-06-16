"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTheme } from "../../utils/hooks/use-theme";

type TocItem = {
  level: number;
  text: string;
  line: number;
};

type TocProps = {
  content: string;
  onItemClick: (line: number) => void;
  isVisible: boolean;
};

// Extract constants to avoid recreating on every render
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;
const BASE_PADDING = 0.5;
const LEVEL_PADDING_INCREMENT = 0.75;

// Memoized style calculation function
const createItemStyle = (level: number): React.CSSProperties => ({
  paddingLeft: `${(level - 1) * LEVEL_PADDING_INCREMENT + BASE_PADDING}rem`,
  lineHeight: 1.3,
});

export const TableOfContents: React.FC<TocProps> = ({ content, onItemClick, isVisible }) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const { isDarkMode } = useTheme();
  const prevContentRef = useRef<string>("");
  const hasInitializedRef = useRef(false);

  // Optimized parsing function with early returns
  const parseTocItems = useCallback((content: string): TocItem[] => {
    if (!content?.trim()) return [];

    const lines = content.split("\n");
    if (lines.length === 0) return [];

    const items: TocItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('#')) continue; // Quick filter before regex
      
      const match = HEADING_REGEX.exec(line);
      if (match) {
        items.push({
          level: match[1].length,
          text: match[2].trim(),
          line: i,
        });
      }
    }

    return items;
  }, []);

  // Memoized class names to avoid recalculation
  const itemBaseClassName = useMemo(
    () => 
      `cursor-pointer whitespace-normal break-words rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
        isDarkMode 
          ? "text-neutral-400 hover:text-neutral-200" 
          : "text-neutral-500 hover:text-neutral-800"
      }`,
    [isDarkMode]
  );

  // Optimized content parsing effect
  useEffect(() => {
    if (!content) {
      if (tocItems.length > 0) setTocItems([]);
      return;
    }

    const shouldUpdate = !hasInitializedRef.current || content !== prevContentRef.current;

    if (shouldUpdate) {
      const newItems = parseTocItems(content);
      setTocItems(newItems);
      prevContentRef.current = content;
      hasInitializedRef.current = true;
    }
  }, [content, parseTocItems, tocItems.length]);

  // Early return for better performance
  if (!isVisible || tocItems.length === 0 || !content) {
    return null;
  }

  return (
    <div className="toc-container max-h-screen overflow-auto">
      <ul className="space-y-1">
        {tocItems.map((item) => (
          <li
            key={item.line}
            className={itemBaseClassName}
            style={createItemStyle(item.level)}
            onClick={() => onItemClick(item.line)}
            onKeyDown={() => {}}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
};
