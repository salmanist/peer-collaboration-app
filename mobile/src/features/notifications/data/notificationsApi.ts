import { apiClient } from "../../../core/network/apiClient";

export interface CampusNotificationItem {
  id: string;
  title: string;
  message: string;
  category: "general" | "enrollment" | "results" | "sessions" | "events" | "urgent" | "rides";
  priority: "normal" | "high" | "urgent";
  action_url?: string | null;
  image?: string | null;
  created_by?: string | null;
  created_by_name: string;
  created_at: string;
  is_active: boolean;
  is_popup_dismissed: boolean;
  is_read: boolean;
  // True for campus-wide broadcasts from the admins (not a private alert for this student).
  is_broadcast?: boolean;
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
  image?: { uri: string; name?: string; type?: string } | null;
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
  if (payload.image) {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("message", payload.message);
    if (payload.category) formData.append("category", payload.category);
    if (payload.priority) formData.append("priority", payload.priority);
    if (payload.action_url) formData.append("action_url", payload.action_url);

    const fileUri = payload.image.uri;
    const filename = payload.image.name || fileUri.split("/").pop() || "announcement.jpg";
    const mimeType = payload.image.type || "image/jpeg";

    formData.append("image", {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);

    const res = await apiClient.post<CampusNotificationItem>("/notifications/admin/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  }

  const res = await apiClient.post<CampusNotificationItem>("/notifications/admin/", payload);
  return res.data;
}

export async function adminDeleteNotification(notificationId: string): Promise<void> {
  await apiClient.delete(`/notifications/admin/${notificationId}/`);
}
