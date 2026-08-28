import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

import {
  adminCreateNotification,
  adminDeleteNotification,
  adminFetchNotifications,
  CampusNotificationItem,
  CreateNotificationPayload,
  dismissNotificationPopup,
  fetchCampusNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./data/notificationsApi";

const DISMISSED_POPUPS_KEY = "lgu_dismissed_notification_popups_v1";

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

async function readDismissedPopupIds(): Promise<string[]> {
  try {
    if (Platform.OS === "web") {
      const storage = getBrowserStorage();
      const raw = storage?.getItem(DISMISSED_POPUPS_KEY);
      if (raw) return JSON.parse(raw);
    } else {
      const raw = await SecureStore.getItemAsync(DISMISSED_POPUPS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [];
}

async function writeDismissedPopupIds(ids: string[]) {
  try {
    const serialized = JSON.stringify(ids);
    if (Platform.OS === "web") {
      getBrowserStorage()?.setItem(DISMISSED_POPUPS_KEY, serialized);
    } else {
      await SecureStore.setItemAsync(DISMISSED_POPUPS_KEY, serialized);
    }
  } catch {}
}

interface CampusNotificationState {
  notifications: CampusNotificationItem[];
  unseenCount: number;
  activePopupNotification: CampusNotificationItem | null;
  dismissedPopupIds: string[];
  isLoading: boolean;
  isCenterOpen: boolean;

  fetchNotifications: () => Promise<void>;
  dismissPopup: (notificationId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  openCenter: () => void;
  closeCenter: () => void;

  // Admin Actions
  adminBroadcasts: CampusNotificationItem[];
  fetchAdminBroadcasts: () => Promise<void>;
  createBroadcast: (payload: CreateNotificationPayload) => Promise<void>;
  deleteBroadcast: (id: string) => Promise<void>;
}

export const useCampusNotificationStore = create<CampusNotificationState>((set, get) => ({
  notifications: [],
  unseenCount: 0,
  activePopupNotification: null,
  dismissedPopupIds: [],
  isLoading: false,
  isCenterOpen: false,

  adminBroadcasts: [],

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      const localDismissed = await readDismissedPopupIds();
      const res = await fetchCampusNotifications();

      const combinedDismissed = Array.from(
        new Set([...localDismissed, ...res.notifications.filter((n) => n.is_popup_dismissed).map((n) => n.id)])
      );

      // Find the first notification that hasn't had its popup dismissed
      const candidatePopup = res.notifications.find(
        (n) => !combinedDismissed.includes(n.id) && !n.is_popup_dismissed
      );

      const unreadCount = res.notifications.filter((n) => !n.is_read).length;

      set({
        notifications: res.notifications,
        unseenCount: unreadCount,
        dismissedPopupIds: combinedDismissed,
        activePopupNotification: candidatePopup || null,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  dismissPopup: async (notificationId: string) => {
    const currentDismissed = get().dismissedPopupIds;
    const nextDismissed = Array.from(new Set([...currentDismissed, notificationId]));

    set({
      dismissedPopupIds: nextDismissed,
      activePopupNotification: null,
    });

    void writeDismissedPopupIds(nextDismissed);

    try {
      await dismissNotificationPopup(notificationId);
    } catch {}
  },

  markAsRead: async (notificationId: string) => {
    const list = get().notifications.map((item) =>
      item.id === notificationId ? { ...item, is_read: true, is_popup_dismissed: true } : item
    );
    const unreadCount = list.filter((n) => !n.is_read).length;

    set({
      notifications: list,
      unseenCount: unreadCount,
    });

    try {
      await markNotificationRead(notificationId);
    } catch {}
  },

  markAllAsRead: async () => {
    const list = get().notifications.map((item) => ({
      ...item,
      is_read: true,
      is_popup_dismissed: true,
    }));

    set({
      notifications: list,
      unseenCount: 0,
      activePopupNotification: null,
    });

    try {
      await markAllNotificationsRead();
    } catch {}
  },

  openCenter: () => set({ isCenterOpen: true }),
  closeCenter: () => set({ isCenterOpen: false }),

  fetchAdminBroadcasts: async () => {
    try {
      const data = await adminFetchNotifications();
      set({ adminBroadcasts: data });
    } catch {}
  },

  createBroadcast: async (payload: CreateNotificationPayload) => {
    const created = await adminCreateNotification(payload);
    set((state) => ({
      adminBroadcasts: [created, ...state.adminBroadcasts],
    }));
    // Re-fetch notifications for current user
    void get().fetchNotifications();
  },

  deleteBroadcast: async (id: string) => {
    await adminDeleteNotification(id);
    set((state) => ({
      adminBroadcasts: state.adminBroadcasts.filter((item) => item.id !== id),
    }));
    void get().fetchNotifications();
  },
}));
