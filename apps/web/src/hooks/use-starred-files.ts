import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "mana:starred-files";
const listeners = new Set<() => void>();

function readStarred(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

let starredIds = readStarred();

function setStarredIds(next: Set<string>) {
  starredIds = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ponytail: localStorage-backed, per-device only, module-level store shared across component instances — move to a DB column + API if starring needs to sync across devices.
export function useStarredFiles() {
  const ids = useSyncExternalStore(subscribe, () => starredIds);

  const isStarred = useCallback((fileId: string) => ids.has(fileId), [ids]);

  const toggleStar = useCallback((fileId: string) => {
    const next = new Set(starredIds);
    if (next.has(fileId)) next.delete(fileId);
    else next.add(fileId);
    setStarredIds(next);
  }, []);

  return { starredIds: ids, isStarred, toggleStar };
}
