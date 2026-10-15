import { create } from "zustand";
import { fetchLostAndFoundNotificationSummary } from "./data/lostAndFoundApi";

interface LostAndFoundNotificationState {
  hasNewItems: boolean;
  hasNewClaims: boolean;
  pendingClaimsCount: number;
  lastSeenItemsAt: string | null;
  lastSeenClaimsAt: string | null;
  pollSummary: () => Promise<void>;
  markItemsSeen: () => void;
  markClaimsSeen: () => void;
}

export const useLostAndFoundNotificationStore = create<LostAndFoundNotificationState>((set, get) => ({
  hasNewItems: false,
  hasNewClaims: false,
  pendingClaimsCount: 0,
  lastSeenItemsAt: null,
  lastSeenClaimsAt: null,

  pollSummary: async () => {
    try {
      const { lastSeenItemsAt, lastSeenClaimsAt } = get();
      const summary = await fetchLostAndFoundNotificationSummary({
        since_items: lastSeenItemsAt ?? undefined,
        since_claims: lastSeenClaimsAt ?? undefined,
      });

      set({
        hasNewItems: summary.has_new_items,
        hasNewClaims: summary.has_new_claims,
        pendingClaimsCount: summary.pending_claims_count,
      });
    } catch {
      // Background polling failure handled silently
    }
  },

  markItemsSeen: () => {
    set({
      hasNewItems: false,
      lastSeenItemsAt: new Date().toISOString(),
    });
  },

  markClaimsSeen: () => {
    set({
      hasNewClaims: false,
      lastSeenClaimsAt: new Date().toISOString(),
    });
  },
}));
