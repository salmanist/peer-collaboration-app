import { apiClient } from "../../../core/network/apiClient";
import type { Paginated } from "./ridesApi";

export interface Notification {
  id: number;
  verb: string;
  content_type: string | null;
  object_id: number | null;
  is_read: boolean;
  created_at: string;
}

export async function listNotifications() {
  const { data } = await apiClient.get<Paginated<Notification>>("/notifications/");
  return data;
}

export async function markNotificationRead(id: number) {
  const { data } = await apiClient.post<Notification>(`/notifications/${id}/read/`);
  return data;
}
