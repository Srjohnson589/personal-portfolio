import { useSyncExternalStore } from "react";

const STORAGE_KEY = "desert-journal:found";
const EMPTY: readonly string[] = [];
const listeners = new Set<() => void>();
let cache: readonly string[] | null = null;

function read(): readonly string[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

export function isFound(id: string) {
  return read().includes(id);
}

export function markFound(id: string) {
  const current = read();
  if (current.includes(id)) return false;
  cache = [...current, id];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {}
  listeners.forEach((listener) => listener());
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFoundRelics() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
