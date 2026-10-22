import {
  fetchCampusNotifications,
  markNotificationRead as markCampusNotificationRead,
  type CampusNotificationItem,
} from "../../notifications/data/notificationsApi";

export type Notification = CampusNotificationItem;

export function isRideNotification(item: Notification): boolean {
  if (item.category === "rides") return true;
  if (item.category !== "general") return false;
  // Older notifications predate module tags. Match only the ride event templates.
  return /^\[Sample\] Ride request accepted$/.test(item.title)
    || item.message === "Your driver has arrived at the pickup point."
    || /^You reached .+\. Please pay the fuel share to your driver\.$/.test(item.message)
    || /^Your on-demand driver approval was (granted|revoked) by an administrator\.$/.test(item.message)
    || /^(The ride to .+ (you requested was cancelled|was cancelled by the .+)\.|Your ride to .+ has started\.|.+ requested to join your ride to .+\.|Your request to join the ride to .+ was (accepted|declined)\.|A driver accepted your ride to .+\.|Ride #\d+ was cancelled by an administrator\.|Your join request for ride #\d+ was declined by an administrator\.)$/.test(item.message)
    || /^\/(?:\(app\)\/)?(?:rides|ondemand)(?:\/|$)/.test(item.action_url || "");
}

export async function listNotifications() {
  const data = await fetchCampusNotifications();
  if (!Array.isArray(data.notifications)) {
    throw new Error("Invalid notification response");
  }
  const results = data.notifications.filter(isRideNotification);
  return { count: results.length, results };
}

export async function markNotificationRead(id: string) {
  await markCampusNotificationRead(id);
}
