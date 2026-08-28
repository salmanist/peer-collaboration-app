import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";
import { fetchTutoringNotificationSummary } from "./data/tutoringApi";
import type { TutoringSession } from "./tutoring";

const DISMISSED_SESSIONS_KEY = "dismissed_rating_session_ids";

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

async function getDismissedSessionIds(): Promise<number[]> {
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      raw = getBrowserStorage()?.getItem(DISMISSED_SESSIONS_KEY) ?? null;
    } else {
      raw = await SecureStore.getItemAsync(DISMISSED_SESSIONS_KEY);
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveDismissedSessionId(sessionId: number): Promise<void> {
  try {
    const current = await getDismissedSessionIds();
    if (!current.includes(sessionId)) {
      const updated = [...current, sessionId];
      const json = JSON.stringify(updated);
      if (Platform.OS === "web") {
        getBrowserStorage()?.setItem(DISMISSED_SESSIONS_KEY, json);
      } else {
        await SecureStore.setItemAsync(DISMISSED_SESSIONS_KEY, json);
      }
    }
  } catch {
    // Ignore storage failure
  }
}

interface TutoringNotificationState {
  pendingRequestsCount: number;
  upcomingConfirmedCount: number;
  hasActiveTutorProfile: boolean;
  unreviewedSession: TutoringSession | null;
  dismissUnreviewedSession: () => void;
  pollSummary: () => Promise<void>;
}

export const useTutoringNotificationStore = create<TutoringNotificationState>((set, get) => ({
  pendingRequestsCount: 0,
  upcomingConfirmedCount: 0,
  hasActiveTutorProfile: false,
  unreviewedSession: null,

  dismissUnreviewedSession: () => {
    const session = get().unreviewedSession;
    if (session) {
      void saveDismissedSessionId(session.id);
    }
    set({ unreviewedSession: null });
  },

  pollSummary: async () => {
    try {
      const summary = await fetchTutoringNotificationSummary();
      const session = summary.unreviewed_session || null;

      if (session) {
        const dismissed = await getDismissedSessionIds();
        if (dismissed.includes(session.id)) {
          set({
            pendingRequestsCount: summary.pending_requests_count,
            upcomingConfirmedCount: summary.upcoming_confirmed_count,
            hasActiveTutorProfile: summary.has_active_tutor_profile,
            unreviewedSession: null,
          });
          return;
        }
      }

      set({
        pendingRequestsCount: summary.pending_requests_count,
        upcomingConfirmedCount: summary.upcoming_confirmed_count,
        hasActiveTutorProfile: summary.has_active_tutor_profile,
        unreviewedSession: session,
      });
    } catch {
      // background poll silently caught
    }
  },
}));
