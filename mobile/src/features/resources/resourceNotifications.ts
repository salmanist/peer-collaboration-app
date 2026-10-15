import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

import { fetchResourceNotificationSummary } from "./data/resourcesApi";

interface ResourceNotificationState {
  hasNewResources: boolean;
  hasNewInterestRequests: boolean;
  checkForUpdates: (userId: number) => Promise<void>;
  markResourcesRead: (userId: number) => Promise<void>;
  markInterestRequestsRead: (userId: number) => Promise<void>;
  reset: () => void;
}

function keyFor(kind: "resources" | "interest", userId: number) {
  return `resource_notifications_${kind}_${userId}`;
}

function browserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

async function getStoredValue(key: string) {
  return Platform.OS === "web"
    ? browserStorage()?.getItem(key) ?? null
    : SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === "web") {
    browserStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export const useResourceNotificationStore = create<ResourceNotificationState>((set) => ({
  hasNewResources: false,
  hasNewInterestRequests: false,

  checkForUpdates: async (userId) => {
    try {
      const [savedResourcesAt, savedInterestAt] = await Promise.all([
        getStoredValue(keyFor("resources", userId)),
        getStoredValue(keyFor("interest", userId)),
      ]);

      const now = new Date().toISOString();
      if (!savedResourcesAt) await setStoredValue(keyFor("resources", userId), now);
      if (!savedInterestAt) await setStoredValue(keyFor("interest", userId), now);

      const summary = await fetchResourceNotificationSummary({
        since_resources: savedResourcesAt || undefined,
        since_interest: savedInterestAt || undefined,
      });

      set({
        hasNewResources: savedResourcesAt ? summary.has_new_resources : false,
        hasNewInterestRequests: savedInterestAt ? summary.has_new_interest : false,
      });
    } catch {
      // A temporary API failure should not hide the app navigation or show false badges.
    }
  },

  markResourcesRead: async (userId) => {
    await setStoredValue(keyFor("resources", userId), new Date().toISOString());
    set({ hasNewResources: false });
  },

  markInterestRequestsRead: async (userId) => {
    await setStoredValue(keyFor("interest", userId), new Date().toISOString());
    set({ hasNewInterestRequests: false });
  },

  reset: () => set({ hasNewResources: false, hasNewInterestRequests: false }),
}));

