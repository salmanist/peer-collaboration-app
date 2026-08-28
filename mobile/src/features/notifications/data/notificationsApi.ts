import { apiClient } from "../../../core/network/apiClient";

export interface CampusNotificationItem {
  id: string;
  title: string;
  message: string;
  category: "general" | "enrollment" | "results" | "sessions" | "events" | "urgent";
  priority: "normal" | "high" | "urgent";
  action_url?: string | null;
  created_by?: string | null;
  created_by_name: string;
  created_at: string;
  is_active: boolean;
  is_popup_dismissed: boolean;
  is_read: boolean;
}

export interface NotificationListResponse {
  notifications: CampusNotificationItem[];
  unseen_count: number;
  has_unseen_popup: boolean;
  latest_popup_notification: CampusNotificationItem | null;
}

export interface CreateNotificationPayload {
  title: string;
  message: string;
  category?: "general" | "enrollment" | "results" | "sessions" | "events" | "urgent";
  priority?: "normal" | "high" | "urgent";
  action_url?: string;
}

export async function fetchCampusNotifications(): Promise<NotificationListResponse> {
  const res = await apiClient.get<NotificationListResponse>("/notifications/");
  return res.data;
}

export async function dismissNotificationPopup(notificationId: string): Promise<void> {
  await apiClient.post(`/notifications/${notificationId}/dismiss-popup/`);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiClient.post(`/notifications/${notificationId}/mark-read/`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post("/notifications/mark-all-read/");
}

export async function adminFetchNotifications(): Promise<CampusNotificationItem[]> {
  const res = await apiClient.get<CampusNotificationItem[]>("/notifications/admin/");
  return res.data;
}

export async function adminCreateNotification(
  payload: CreateNotificationPayload
): Promise<CampusNotificationItem> {
  const res = await apiClient.post<CampusNotificationItem>("/notifications/admin/", payload);
  return res.data;
}

export async function adminDeleteNotification(notificationId: string): Promise<void> {
  await apiClient.delete(`/notifications/admin/${notificationId}/`);
}
