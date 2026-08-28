import axios, { AxiosError } from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { getSessionSnapshot } from "../auth/session";

function resolveApiBaseUrl(): string {
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_WEB_API_URL ?? "http://localhost:8000/api";
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Auto-detect computer IP from Expo Metro bundler hostUri when running on Expo Go / physical device
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:8000/api`;
    }
  }

  // Fallback to active LAN IP
  return "http://192.168.10.49:8000/api";
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
    await setAccessToken(data.access);
    return data.access as string;
  } catch {
    await clearSession();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshInFlight) {
        refreshInFlight = refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
      }

      const newAccessToken = await refreshInFlight;
      if (newAccessToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
