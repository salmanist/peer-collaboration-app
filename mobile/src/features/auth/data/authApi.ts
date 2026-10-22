import { apiClient } from "../../../core/network/apiClient";
import type { AuthedUser } from "../../../core/auth/session";

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
  department?: string;
  enrollment_year?: string;
}


export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthedUser;
}

export interface RegisterResponse {
  detail: string;
  phone_number?: string;
  debug_otp?: string;
}

export async function register(payload: RegisterPayload) {
  const { data } = await apiClient.post<RegisterResponse>("/auth/register/", payload);
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

export async function updateMe(patch: Partial<Pick<AuthedUser, "bio" | "skills" | "gender">>) {
  const { data } = await apiClient.patch<AuthedUser>("/auth/me/", patch);
  return data;
}

export interface ForgotPasswordResponse {
  detail: string;
  phone_number?: string;
  debug_otp?: string;
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post<ForgotPasswordResponse>("/auth/forgot-password/", { email });
  return data;
}

export async function resetPassword(payload: { email: string; code: string; new_password: string }) {
  const { data } = await apiClient.post<{ detail: string }>("/auth/reset-password/", payload);
  return data;
}
