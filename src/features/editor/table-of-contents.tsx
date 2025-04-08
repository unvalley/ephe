"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTheme } from "../../hooks/use-theme";

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

  const handleItemClick = useCallback(
    (line: number) => {
      onItemClick(line);
    },
    [onItemClick],
  );

  const shouldRender = useMemo(() => {
    // Check if parent component wants to show TOC (isVisibleToc from parent)
    return isVisible && tocItems.length > 0 && !!content;
  }, [isVisible, tocItems.length, content]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="toc-container overflow-auto max-h-screen">
      <ul className="space-y-1">
        {tocItems.map((item) => (
          <li
            key={item.line}
            className={`cursor-pointer py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 break-words whitespace-normal
                ${isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-800"}`}
            style={{
              paddingLeft: `${(item.level - 1) * 0.75 + 0.5}rem`,
              lineHeight: 1.3,
            }}
            onClick={() => handleItemClick(item.line)}
            onKeyDown={() => {}}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
};
