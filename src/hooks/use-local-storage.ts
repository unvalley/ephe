"use client";

import { useState, useEffect } from "react";

// TODO: handle size limit

/**
 * Custom hook for persisting and retrieving data from localStorage
 * @param key The localStorage key to store the value under
 * @param initialValue The initial value to use if no value is stored
 * @returns A stateful value and a function to update it
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // 初期値の取得
  const readValue = (): T => {
    try {
      const item = window.localStorage.getItem(key);
      
      // エディタコンテンツの場合は JSON パースしない
      if (key === "editor-content" && item !== null) {
        return item as unknown as T;
      }
      
      // それ以外の場合は通常通り JSON パース
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // 値を設定する関数
  const setValue = (value: T) => {
    try {
      // エディタコンテンツの場合は文字列としてそのまま保存
      if (key === "editor-content") {
        window.localStorage.setItem(key, value as unknown as string);
      } else {
        // それ以外の場合は JSON 文字列に変換して保存
        window.localStorage.setItem(key, JSON.stringify(value));
      }
      
      setStoredValue(value);
      
      // 他のウィンドウに変更を通知
      window.dispatchEvent(new Event("local-storage"));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // 他のウィンドウでの変更を監視
  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue());
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, []);

  return [storedValue, setValue];
}
