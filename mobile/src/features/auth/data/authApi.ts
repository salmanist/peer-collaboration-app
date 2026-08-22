import { apiClient } from "../../../core/network/apiClient";
import type { AuthedUser } from "../../../core/auth/session";

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthedUser;
}

export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post<{ detail: string }>("/auth/register/", payload);
  return data;
}

export async function verifyEmail(email: string, code: string) {
  const { data } = await apiClient.post<{ detail: string }>("/auth/verify-email/", { email, code });
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<LoginResponse>("/auth/login/", { email, password });
  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get<AuthedUser>("/auth/me/");
  return data;
}
