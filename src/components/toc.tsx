"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useTheme } from "../hooks/use-theme";

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

export const TableOfContents: React.FC<TocProps> = ({
  content,
  onItemClick,
  isVisible,
}) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  useEffect(() => {
    if (!content) {
      setTocItems([]);
      return;
    }

    const items: TocItem[] = [];
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      // Match markdown headings (# Heading)
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        items.push({
          level: match[1].length,
          text: match[2].trim(),
          line: index,
        });
      }
    });

    setTocItems(items);
  }, [content]);

  if (!isVisible || tocItems.length === 0) {
    return null;
  }

  return (
    <div className="toc-container overflow-auto max-h-screen">
      <ul className="space-y-1">
        {tocItems.map((item, _) => (
          <li
            key={item.line}
            className={`cursor-pointer hover:underline text-sm ${
              isDarkMode
                ? "text-gray-400 hover:text-gray-200"
                : "text-gray-500 hover:text-gray-800"
            }`}
            style={{
              paddingLeft: `${(item.level - 1) * 0.75}rem`,
              opacity: 1 - (item.level - 1) * 0.1,
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
