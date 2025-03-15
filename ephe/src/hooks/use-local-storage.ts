'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook for persisting and retrieving data from localStorage
 * @param key The localStorage key to store the value under
 * @param initialValue The initial value to use if no value is stored
 * @returns A stateful value and a function to update it
 */
export const useLocalStorage = <T>(key: string, initialValue: T): [T, (value: T) => void] => {
  // Initialize state with value from localStorage or initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Update localStorage when the state changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
} 