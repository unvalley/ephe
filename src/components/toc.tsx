"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

export const TableOfContents: React.FC<TocProps> = ({ content, onItemClick, isVisible }) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const prevContentRef = useRef<string>("");
  const updateTimeoutRef = useRef<number | null>(null);

  // 差分解析のためのメモ化関数 - 変更があった部分だけを解析
  const parseTocItems = useCallback(
    (content: string, prevContent: string): TocItem[] => {
      if (!content) return [];

      // 前回と同じコンテンツなら再計算しない
      if (content === prevContent) {
        return tocItems;
      }

      // 最適化: 行単位で差分を検出して部分的に更新
      const newLines = content.split("\n");
      const prevLines = prevContent ? prevContent.split("\n") : [];

      // 既存のTOCアイテムをマップとして保持（行番号をキーとする）
      const existingItemsMap = new Map<number, TocItem>();
      for (const item of tocItems) {
        existingItemsMap.set(item.line, item);
      }

      const items: TocItem[] = [];
      let hasChanges = false;

      // 各行を処理
      for (let i = 0; i < newLines.length; i++) {
        const line = newLines[i];

        // 前回と同じ行で、既存のTOCアイテムがある場合は再利用
        if (i < prevLines.length && line === prevLines[i] && existingItemsMap.has(i)) {
          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          items.push(existingItemsMap.get(i)!);
          continue;
        }

        // 見出し行かどうかをチェック
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

    // 更新をスケジュール
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
            className={`cursor-pointer py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
              isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-800"
            }`}
            style={{
              paddingLeft: `${(item.level - 1) * 0.75 + 0.5}rem`,
              wordBreak: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "normal",
              lineHeight: "1.3",
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
