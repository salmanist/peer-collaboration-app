import * as SecureStore from "expo-secure-store";
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

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isHydrated: false,

  hydrate: async () => {
    const [access, refresh, rawUser] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(USER_KEY),
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
      SecureStore.setItemAsync(ACCESS_KEY, tokens.access),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    set({ accessToken: tokens.access, refreshToken: tokens.refresh, user });
  },

  setAccessToken: async (access) => {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    set({ accessToken: access });
  },

  updateUser: (user) => {
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  clearSession: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

// Non-hook accessor for the apiClient interceptor, which lives outside React.
export const getSessionSnapshot = () => useSessionStore.getState();
