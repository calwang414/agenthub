"use client";

import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch {
      // fallback to initialValue
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    const handler = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        } else {
          setStoredValue(initialValue);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener(key + "-changed", handler);
    return () => window.removeEventListener(key + "-changed", handler);
  }, [key, loaded, initialValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        window.dispatchEvent(new Event(key + "-changed"));
        return next;
      });
    },
    [key]
  );

  return [storedValue, setValue, loaded] as const;
}
