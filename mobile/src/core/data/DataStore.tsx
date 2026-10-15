import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

// A plain in-memory "shared box" for screen data that survives navigating away and
// back. Without this, every screen re-fetches from the API (and shows a loading
// spinner) each time it regains focus, even if nothing changed since last time.
// Living in a Context means one Map is created once at the app root and every
// screen reads/writes the same instance - no prop drilling, no extra library.
// It's memory-only: cleared on a full app reload, never written to disk.
interface DataStoreValue {
  getCache: <T>(key: string) => T | undefined;
  setCache: <T>(key: string, value: T) => void;
  clearCache: (key: string) => void;
}

const DataStoreContext = createContext<DataStoreValue | null>(null);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  // useRef (not useState) on purpose - writing to the cache shouldn't re-render
  // every screen that happens to be mounted, only the one screen that reads it
  // back out on its own next mount/focus.
  const cache = useRef(new Map<string, unknown>());

  const getCache = useCallback(<T,>(key: string) => cache.current.get(key) as T | undefined, []);
  const setCache = useCallback(<T,>(key: string, value: T) => {
    cache.current.set(key, value);
  }, []);
  const clearCache = useCallback((key: string) => {
    cache.current.delete(key);
  }, []);

  const value = useMemo(() => ({ getCache, setCache, clearCache }), [getCache, setCache, clearCache]);

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
}

// Throws outside the provider on purpose - a screen reading from a store that was
// never mounted at the app root is a wiring bug, not a state to quietly fall back from.
export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used within a DataStoreProvider");
  return ctx;
}
