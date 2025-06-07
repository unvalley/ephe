"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
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

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

export const TableOfContents: React.FC<TocProps> = ({ content, onItemClick, isVisible }) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const { isDarkMode } = useTheme();
  const prevContentRef = useRef<string>("");
  const hasInitializedRef = useRef(false);

  const parseTocItems = useCallback((content: string): TocItem[] => {
    if (!content) return [];

    const lines = content.split("\n");
    const items: TocItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
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

  // Always parse content on initial render and when content changes
  useEffect(() => {
    // Always parse content regardless of visibility
    if (!content) {
      setTocItems([]);
      return;
    }

    // Always parse on initial load or when content changes
    const shouldUpdate = !hasInitializedRef.current || content !== prevContentRef.current;

    if (shouldUpdate) {
      const newItems = parseTocItems(content);
      setTocItems(newItems);
      prevContentRef.current = content;
      hasInitializedRef.current = true;
    }
  }, [content, parseTocItems]);

  const shouldRender = isVisible && tocItems.length > 0 && !!content;
  if (!shouldRender) {
    return null;
  }

  return (
    <div className="toc-container max-h-screen overflow-auto">
      <ul className="space-y-1">
        {tocItems.map((item) => (
          <li
            key={item.line}
            className={`cursor-pointer whitespace-normal break-words rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${isDarkMode ? "text-neutral-400 hover:text-neutral-200" : "text-neutral-500 hover:text-neutral-800"}`}
            style={{
              paddingLeft: `${(item.level - 1) * 0.75 + 0.5}rem`,
              lineHeight: 1.3,
            }}
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
