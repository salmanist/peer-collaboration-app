import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

// expo-secure-store has no web implementation (its web module is a stub) —
// fall back to localStorage there, same non-secure tradeoff every Expo app
// makes on web since browsers have no secure-enclave equivalent.
const storage = Platform.OS === "web"
  ? {
      getItemAsync: async (key: string) => localStorage.getItem(key),
      setItemAsync: async (key: string, value: string) => localStorage.setItem(key, value),
      deleteItemAsync: async (key: string) => localStorage.removeItem(key),
    }
  : SecureStore;

export type AccountRole = "student" | "admin";

export type Gender = "male" | "female" | "";

export interface AuthedUser {
  id: number;
  email: string;
  full_name: string;
  department: string;
  enrollment_year: number | null;
  gender: Gender;
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

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isHydrated: false,

  hydrate: async () => {
    const [access, refresh, rawUser] = await Promise.all([
      storage.getItemAsync(ACCESS_KEY),
      storage.getItemAsync(REFRESH_KEY),
      storage.getItemAsync(USER_KEY),
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
      storage.setItemAsync(ACCESS_KEY, tokens.access),
      storage.setItemAsync(REFRESH_KEY, tokens.refresh),
      storage.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ accessToken: tokens.access, refreshToken: tokens.refresh, user });
  },

  setAccessToken: async (access) => {
    await storage.setItemAsync(ACCESS_KEY, access);
    set({ accessToken: access });
  },

  updateUser: (user) => {
    storage.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  clearSession: async () => {
    await Promise.all([
      storage.deleteItemAsync(ACCESS_KEY),
      storage.deleteItemAsync(REFRESH_KEY),
      storage.deleteItemAsync(USER_KEY),
    ]);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

// Non-hook accessor for the apiClient interceptor, which lives outside React.
export const getSessionSnapshot = () => useSessionStore.getState();
