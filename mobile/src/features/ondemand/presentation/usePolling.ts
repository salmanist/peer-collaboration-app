import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

export const POLL_INTERVAL_MS = 5000;

// Runs `callback` right away and then every 5 seconds, but only while the screen is showing.
// (Polling = the app asking the server "anything new?" on a timer; no live connection needed.)
export function usePolling(callback: () => void | Promise<void>, intervalMs = POLL_INTERVAL_MS) {
  const latestCallback = useRef(callback);
  latestCallback.current = callback;

  useFocusEffect(
    useCallback(() => {
      latestCallback.current();
      const timerId = setInterval(() => latestCallback.current(), intervalMs);
      return () => clearInterval(timerId);
    }, [intervalMs]),
  );
}
