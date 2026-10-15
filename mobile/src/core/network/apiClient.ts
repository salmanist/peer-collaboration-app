import axios, { AxiosError } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { getSessionSnapshot } from "../auth/session";

function resolveApiBaseUrl(): string {
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_WEB_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api";
  }
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  // On Expo Go the Metro host is the dev machine, so reuse its IP for the API.
  const hostUri = Constants.expoConfig?.hostUri;
  const ip = hostUri?.split(":")[0];
  if (ip && ip !== "localhost" && ip !== "127.0.0.1") return `http://${ip}:8000/api`;
  return "http://localhost:8000/api";
}

export const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const { accessToken } = getSessionSnapshot();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setAccessToken, clearSession } = getSessionSnapshot();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh: refreshToken });
    await setAccessToken(data.access, data.refresh);
    return data.access as string;
  } catch {
    await clearSession();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retried?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;
      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      const newAccess = await refreshInFlight;
      if (newAccess) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
