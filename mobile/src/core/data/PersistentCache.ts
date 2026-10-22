import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

// The second, longer-lived cache tier alongside DataStore.tsx's in-memory Map.
// That one is a shared Context Map that empties on every app restart - fine for
// fast-changing lists like rides/library projects. This one is for the opposite
// case: reference data that barely ever changes (departments today), where
// refetching on every single app open is wasted work. AsyncStorage is already
// one shared module app-wide, so unlike the in-memory cache this needs no
// Context/Provider - every caller reading the same key reads the same on-device
// value directly.
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredEntry<T> {
  data: T;
  fetchedAt: number;
}

// Read-cache-first, stale-while-revalidate: shows whatever's on disk immediately
// (even before checking its age, so the screen never waits on a network round trip
// just to render), then silently refetches in the background if that data is older
// than maxAgeMs. First-ever call (nothing on disk yet) fetches normally instead.
export function usePersistentCache<T>(key: string, fetcher: () => Promise<T>, maxAgeMs: number = DEFAULT_MAX_AGE_MS) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // A ref, not a dependency, so passing a fresh inline fetcher function each render
  // doesn't re-trigger the load effect below - only `key` and `maxAgeMs` should.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    const fresh = await fetcherRef.current();
    setData(fresh);
    const entry: StoredEntry<T> = { data: fresh, fetchedAt: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    return fresh;
  }, [key]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const raw = await AsyncStorage.getItem(key);
      let stored: StoredEntry<T> | null = null;
      if (raw) {
        try {
          stored = JSON.parse(raw);
        } catch {
          stored = null; // corrupted entry - fall through to a normal fetch below
        }
      }

      if (stored) {
        if (!cancelled) {
          setData(stored.data);
          setIsLoading(false);
        }
        if (Date.now() - stored.fetchedAt > maxAgeMs) {
          // Stale - refetch in the background and let `refresh` silently update
          // both state and storage once it lands. Screen already has something
          // to show, so a failure here just means "try again next time".
          refresh().catch(() => {});
        }
        return;
      }

      // Nothing cached yet (first-ever open) - fetch normally.
      if (!cancelled) setIsLoading(true);
      try {
        await refresh();
      } catch {
        // Safe fallback if network/backend is unreachable
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, maxAgeMs, refresh]);

  return { data, isLoading, refresh };
}
