import { router } from "expo-router";
import { Linking } from "react-native";
import { CampusNotificationItem } from "./data/notificationsApi";

export interface NotificationTarget {
  route: string;
  isExternal: boolean;
  actionLabel: string;
  categoryLabel: string;
  icon: string;
  accentColor: string;
  badgeBg: string;
}

export function resolveNotificationTarget(item: Partial<CampusNotificationItem>): NotificationTarget {
  const actionUrl = (item.action_url || "").trim();
  const category = (item.category || "").toLowerCase();
  const text = `${item.title || ""} ${item.message || ""}`.toLowerCase();

  // 1. External HTTP(S) Links
  if (actionUrl.startsWith("http://") || actionUrl.startsWith("https://")) {
    return {
      route: actionUrl,
      isExternal: true,
      actionLabel: "Open Link",
      categoryLabel: "Web Link",
      icon: "open-in-new",
      accentColor: "#2563EB",
      badgeBg: "#EFF6FF",
    };
  }

  // 2. Explicit action_url
  if (actionUrl) {
    const cleanRoute = actionUrl.startsWith("/") ? actionUrl : `/(app)/${actionUrl}`;

    if (cleanRoute.includes("rides") || cleanRoute.includes("ondemand")) {
      return {
        route: cleanRoute,
        isExternal: false,
        actionLabel: "Open Rides",
        categoryLabel: "Ride Share",
        icon: "car",
        accentColor: "#2563EB",
        badgeBg: "#DBEAFE",
      };
    }
    if (cleanRoute.includes("tutoring")) {
      return {
        route: cleanRoute,
        isExternal: false,
        actionLabel: "View Tutoring",
        categoryLabel: "Peer Tutoring",
        icon: "school",
        accentColor: "#7C3AED",
        badgeBg: "#F3E8FF",
      };
    }
    if (cleanRoute.includes("library")) {
      return {
        route: cleanRoute,
        isExternal: false,
        actionLabel: "Open Library",
        categoryLabel: "Digital Library",
        icon: "book-open-page-variant",
        accentColor: "#16A34A",
        badgeBg: "#DCFCE7",
      };
    }
    if (cleanRoute.includes("printing")) {
      return {
        route: cleanRoute,
        isExternal: false,
        actionLabel: "Open Print Center",
        categoryLabel: "Print Center",
        icon: "printer",
        accentColor: "#E11D48",
        badgeBg: "#FFE4E6",
      };
    }
    if (cleanRoute.includes("lost-and-found")) {
      return {
        route: cleanRoute,
        isExternal: false,
        actionLabel: "View Lost & Found",
        categoryLabel: "Lost & Found",
        icon: "magnify",
        accentColor: "#D97706",
        badgeBg: "#FEF3C7",
      };
    }
    if (cleanRoute.includes("resources")) {
      return {
        route: cleanRoute,
        isExternal: false,
        actionLabel: "Open Marketplace",
        categoryLabel: "Marketplace",
        icon: "storefront-outline",
        accentColor: "#059669",
        badgeBg: "#D1FAE5",
      };
    }
    if (cleanRoute.includes("admin")) {
      return {
        route: cleanRoute,
        isExternal: false,
        actionLabel: "Open Admin",
        categoryLabel: "Admin Center",
        icon: "shield-account",
        accentColor: "#475569",
        badgeBg: "#F1F5F9",
      };
    }
    if (cleanRoute.includes("profile")) {
      return {
        route: cleanRoute,
        isExternal: false,
        actionLabel: "View Profile",
        categoryLabel: "Profile",
        icon: "account",
        accentColor: "#0D3E02",
        badgeBg: "#E8F5E9",
      };
    }

    return {
      route: cleanRoute,
      isExternal: false,
      actionLabel: "View Details",
      categoryLabel: "Notice",
      icon: "arrow-right-circle-outline",
      accentColor: "#0D3E02",
      badgeBg: "#E8F5E9",
    };
  }

  // 3. Category & Keyword Fallbacks
  if (
    category === "rides" ||
    text.includes("ride") ||
    text.includes("driver") ||
    text.includes("carpool") ||
    text.includes("passenger")
  ) {
    return {
      route: "/(app)/rides",
      isExternal: false,
      actionLabel: "Open Rides",
      categoryLabel: "Ride Share",
      icon: "car",
      accentColor: "#2563EB",
      badgeBg: "#DBEAFE",
    };
  }

  if (
    category === "sessions" ||
    category === "tutoring" ||
    text.includes("tutoring") ||
    text.includes("tutor") ||
    text.includes("study session") ||
    text.includes("session request")
  ) {
    return {
      route: "/(app)/tutoring",
      isExternal: false,
      actionLabel: "View Tutoring",
      categoryLabel: "Peer Tutoring",
      icon: "school",
      accentColor: "#7C3AED",
      badgeBg: "#F3E8FF",
    };
  }

  if (
    category === "library" ||
    text.includes("library") ||
    text.includes("past paper") ||
    text.includes("lecture note") ||
    text.includes("study material") ||
    text.includes("semester project")
  ) {
    return {
      route: "/(app)/library",
      isExternal: false,
      actionLabel: "Open Library",
      categoryLabel: "Digital Library",
      icon: "book-open-page-variant",
      accentColor: "#16A34A",
      badgeBg: "#DCFCE7",
    };
  }

  if (
    category === "printing" ||
    text.includes("print") ||
    text.includes("printer") ||
    text.includes("printing") ||
    text.includes("document print")
  ) {
    return {
      route: "/(app)/printing",
      isExternal: false,
      actionLabel: "Open Print Center",
      categoryLabel: "Print Center",
      icon: "printer",
      accentColor: "#E11D48",
      badgeBg: "#FFE4E6",
    };
  }

  if (
    category.includes("lost") ||
    text.includes("lost & found") ||
    text.includes("lost and found") ||
    text.includes("lost item") ||
    text.includes("claim verification") ||
    text.includes("claim")
  ) {
    return {
      route: "/(app)/lost-and-found",
      isExternal: false,
      actionLabel: "View Lost & Found",
      categoryLabel: "Lost & Found",
      icon: "magnify",
      accentColor: "#D97706",
      badgeBg: "#FEF3C7",
    };
  }

  if (
    category === "resources" ||
    category === "marketplace" ||
    text.includes("resource") ||
    text.includes("marketplace") ||
    text.includes("item interest") ||
    text.includes("resource offer")
  ) {
    return {
      route: "/(app)/resources",
      isExternal: false,
      actionLabel: "Open Marketplace",
      categoryLabel: "Marketplace",
      icon: "storefront-outline",
      accentColor: "#059669",
      badgeBg: "#D1FAE5",
    };
  }

  if (category === "admin" || text.includes("admin center")) {
    return {
      route: "/(app)/admin",
      isExternal: false,
      actionLabel: "Open Admin",
      categoryLabel: "Admin Center",
      icon: "shield-account",
      accentColor: "#475569",
      badgeBg: "#F1F5F9",
    };
  }

  if (category === "profile" || text.includes("profile") || text.includes("credentials")) {
    return {
      route: "/(app)/profile",
      isExternal: false,
      actionLabel: "View Profile",
      categoryLabel: "Profile",
      icon: "account",
      accentColor: "#0D3E02",
      badgeBg: "#E8F5E9",
    };
  }

  // Default campus announcements / general notice
  return {
    route: "/(app)/home",
    isExternal: false,
    actionLabel: "View Campus",
    categoryLabel: "Notice",
    icon: "bell-ring-outline",
    accentColor: "#0D3E02",
    badgeBg: "#E8F5E9",
  };
}

export async function navigateToNotification(
  target: NotificationTarget,
  onBeforeNavigate?: () => void
) {
  if (onBeforeNavigate) {
    onBeforeNavigate();
  }

  setTimeout(async () => {
    try {
      if (target.isExternal) {
        const canOpen = await Linking.canOpenURL(target.route);
        if (canOpen) {
          await Linking.openURL(target.route);
        }
      } else {
        router.push(target.route as any);
      }
    } catch (err) {
      console.warn("Notification navigation error:", err);
    }
  }, 100);
}
