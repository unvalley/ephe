"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTheme } from "../hooks/use-theme";
import { TableOfContentsIcon } from "./icons";

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
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const prevContentRef = useRef<string>("");
  const updateTimeoutRef = useRef<number | null>(null);

  const parseTocItems = useCallback(
    (content: string, prevContent: string): TocItem[] => {
      if (!content) return [];
      if (content === prevContent) {
        return tocItems;
      }

      // PERF: partial update by line
      const newLines = content.split("\n");
      const prevLines = prevContent ? prevContent.split("\n") : [];

      // PERF: keep existing items in a map (by line number)
      const existingItemsMap = new Map<number, TocItem>();
      for (const item of tocItems) {
        existingItemsMap.set(item.line, item);
      }

      const items: TocItem[] = [];
      let hasChanges = false;

      for (let i = 0; i < newLines.length; i++) {
        const line = newLines[i];

        // PERF: reuse existing items if the line is the same
        if (i < prevLines.length && line === prevLines[i] && existingItemsMap.has(i)) {
          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          items.push(existingItemsMap.get(i)!);
          continue;
        }

        // check if the line is a heading
        const match = HEADING_REGEX.exec(line);
        if (match) {
          hasChanges = true;
          items.push({
            level: match[1].length,
            text: match[2].trim(),
            line: i,
          });
        }
      }

      return hasChanges ? items : items.length > 0 ? items : tocItems;
    },
    [tocItems],
  );

  useEffect(() => {
    if (!isVisible || !content || content.length < 10) {
      return;
    }

    if (content === prevContentRef.current) {
      return;
    }

    if (updateTimeoutRef.current !== null) {
      cancelAnimationFrame(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = requestAnimationFrame(() => {
      const newItems = parseTocItems(content, prevContentRef.current);
      setTocItems(newItems);
      prevContentRef.current = content;
      updateTimeoutRef.current = null;
    });

    return () => {
      if (updateTimeoutRef.current !== null) {
        cancelAnimationFrame(updateTimeoutRef.current);
      }
    };
  }, [content, isVisible, parseTocItems]);

  const handleItemClick = useCallback(
    (line: number) => {
      onItemClick(line);
    },
    [onItemClick],
  );

  const shouldRender = useMemo(() => {
    return isVisible && tocItems.length > 0;
  }, [isVisible, tocItems.length]);

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

export const TableOfContentsButton = ({ isVisible, toggleToc }: { isVisible: boolean; toggleToc: () => void }) => {
  return (
    <button
      type="button"
      onClick={toggleToc}
      className={"toc-toggle-button cursor-pointer"}
      title={isVisible ? "Hide table of contents" : "Show table of contents"}
    >
      <TableOfContentsIcon />
    </button>
  );
};
