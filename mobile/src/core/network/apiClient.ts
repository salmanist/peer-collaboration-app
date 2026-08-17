import axios, { AxiosError } from "axios";
import { Platform } from "react-native";

import { getSessionSnapshot } from "../auth/session";

export const API_BASE_URL = Platform.OS === "web"
  ? process.env.EXPO_PUBLIC_WEB_API_URL ?? "http://localhost:8000/api"
  : process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api";

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
