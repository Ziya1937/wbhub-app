import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * Module-level store — lives outside React, so it survives the unmount/remount
 * that React Router does on every navigation between pages.
 */
const store = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T) {
  store.set(key, value);
}

/**
 * Like useState([]), but seeds from the module-level cache so a page that was
 * already visited this session shows its last-known list immediately instead
 * of flashing empty while it refetches in the background.
 */
export function useCachedList<T>(key: string): [T[], Dispatch<SetStateAction<T[]>>] {
  return useCachedState<T[]>(key, []);
}

/** Same idea as useCachedList, but for a single cached value (not just arrays). */
export function useCachedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const cached = getCached<T>(key);
    return cached !== undefined ? cached : initial;
  });
  const setAndCache: Dispatch<SetStateAction<T>> = (next) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      setCached(key, resolved);
      return resolved;
    });
  };
  return [value, setAndCache];
}
