import { useState, useEffect } from 'react';

/**
 * Generic hook that mirrors useState but persists to localStorage.
 *
 * @param key          - The localStorage key to read/write.
 * @param initialValue - Value used when the key is absent or unparseable.
 * @returns            - [value, setValue] with the same signature as useState.
 */
export function useStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValueState] = useState<T>(() => {
    // Defensive: no-op in SSR / environments without window.
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return initialValue;
      return JSON.parse(stored) as T;
    } catch (err) {
      console.warn(`[useStorage] Failed to read key "${key}" from localStorage:`, err);
      return initialValue;
    }
  });

  // Persist whenever value changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[useStorage] Failed to write key "${key}" to localStorage:`, err);
    }
  }, [key, value]);

  // Wrap setState so callers can pass either a value or an updater function,
  // exactly like the native useState setter.
  const setValue = (next: T | ((prev: T) => T)) => {
    setValueState((prev) =>
      typeof next === 'function' ? (next as (prev: T) => T)(prev) : next,
    );
  };

  return [value, setValue];
}
