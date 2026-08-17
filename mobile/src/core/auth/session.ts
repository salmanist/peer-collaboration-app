import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

export type AccountRole = "student" | "admin";

export interface AuthedUser {
  id: number;
  email: string;
  full_name: string;
  department: string;
  enrollment_year: number | null;
  role: AccountRole;
  is_email_verified: boolean;
  created_at: string;
}

interface SessionState {
  user: AuthedUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (tokens: { access: string; refresh: string }, user: AuthedUser) => Promise<void>;
  setAccessToken: (access: string) => Promise<void>;
  updateUser: (user: AuthedUser) => void;
  clearSession: () => Promise<void>;
}

const ACCESS_KEY = "auth_access_token";
const REFRESH_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

async function getStoredValue(key: string) {
  if (Platform.OS === "web") {
    return getBrowserStorage()?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === "web") {
    getBrowserStorage()?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredValue(key: string) {
  if (Platform.OS === "web") {
    getBrowserStorage()?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isHydrated: false,

  hydrate: async () => {
    const [access, refresh, rawUser] = await Promise.all([
      getStoredValue(ACCESS_KEY),
      getStoredValue(REFRESH_KEY),
      getStoredValue(USER_KEY),
    ]);
    set({
      accessToken: access,
      refreshToken: refresh,
      user: rawUser ? JSON.parse(rawUser) : null,
      isHydrated: true,
    });
  },

  setSession: async (tokens, user) => {
    await Promise.all([
      setStoredValue(ACCESS_KEY, tokens.access),
      setStoredValue(REFRESH_KEY, tokens.refresh),
      setStoredValue(USER_KEY, JSON.stringify(user)),
    ]);
    set({ accessToken: tokens.access, refreshToken: tokens.refresh, user });
  },

  setAccessToken: async (access) => {
    await setStoredValue(ACCESS_KEY, access);
    set({ accessToken: access });
  },

  updateUser: (user) => {
    void setStoredValue(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  clearSession: async () => {
    await Promise.all([
      deleteStoredValue(ACCESS_KEY),
      deleteStoredValue(REFRESH_KEY),
      deleteStoredValue(USER_KEY),
    ]);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

// Non-hook accessor for the apiClient interceptor, which lives outside React.
export const getSessionSnapshot = () => useSessionStore.getState();
