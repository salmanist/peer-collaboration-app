import React from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useResourceNotificationStore } from "../../features/resources/resourceNotifications";
import { useLostAndFoundNotificationStore } from "../../features/lost_and_found/lostAndFoundNotifications";
import { useTutoringNotificationStore } from "../../features/tutoring/tutoringNotifications";
import { useModuleUsageStore } from "../store/useModuleUsageStore";

export default function AppBottomBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname() || "";

  const hasNewResources = useResourceNotificationStore((state) => state.hasNewResources);
  const hasNewInterestRequests = useResourceNotificationStore((state) => state.hasNewInterestRequests);
  const hasNewClaims = useLostAndFoundNotificationStore((state) => state.hasNewClaims);
  const pendingTutoringRequests = useTutoringNotificationStore((state) => state.pendingRequestsCount);

  // Hide bottom bar on full-screen detail, chat, or form creation screens for clean UX
  const isSubScreen =
    pathname.includes("/chat/") ||
    pathname.includes("/create") ||
    pathname.includes("/edit") ||
    pathname.includes("/setup") ||
    pathname.includes("/admin");

  if (isSubScreen) {
    return null;
  }

  const isHome = pathname === "/" || pathname === "/index" || pathname === "";
  const isResources = pathname.startsWith("/resources");
  const isLostAndFound = pathname.startsWith("/lost-and-found");
  const isTutoring = pathname.startsWith("/tutoring");

  const tabs = [
    {
      id: "home",
      label: "Home",
      activeIcon: "home-variant" as const,
      inactiveIcon: "home-variant-outline" as const,
      isActive: isHome,
      route: "/(app)",
      badge: false,
    },
    {
      id: "resources",
      label: "Marketplace",
      activeIcon: "storefront" as const,
      inactiveIcon: "storefront-outline" as const,
      isActive: isResources,
      route: "/(app)/resources",
      badge: hasNewResources || hasNewInterestRequests,
    },
    {
      id: "lost-and-found",
      label: "Lost & Found",
      activeIcon: "compass" as const,
      inactiveIcon: "compass-outline" as const,
      isActive: isLostAndFound,
      route: "/(app)/lost-and-found",
      badge: hasNewClaims,
    },
    {
      id: "tutoring",
      label: "Tutoring",
      activeIcon: "school" as const,
      inactiveIcon: "school-outline" as const,
      isActive: isTutoring,
      route: "/(app)/tutoring",
      badge: pendingTutoringRequests > 0,
      badgeCount: pendingTutoringRequests > 0 ? pendingTutoringRequests : undefined,
    },
    {
      id: "ride_sharing",
      label: "Ride Share",
      activeIcon: "car-multiple" as const,
      inactiveIcon: "car-multiple" as const,
      isActive: false,
      route: "ride_sharing_dummy",
      badge: false,
    },
  ];

  const handleTabPress = (tab: (typeof tabs)[0]) => {
    if (tab.id === "ride_sharing") {
      if (Platform.OS === "web") {
        window.alert("🚗 Ride Sharing: Coming Soon!\nCampus commute & student carpooling is under development.");
      } else {
        Alert.alert(
          "🚗 Ride Sharing",
          "Coming Soon! Student carpooling and campus commute coordination is currently under development.",
          [{ text: "Got It" }]
        );
      }
      return;
    }

    if (tab.id === "resources") {
      useModuleUsageStore.getState().recordVisit("marketplace");
    } else if (tab.id === "lost-and-found") {
      useModuleUsageStore.getState().recordVisit("lost_and_found");
    } else if (tab.id === "tutoring") {
      useModuleUsageStore.getState().recordVisit("tutoring");
    }

    if (!tab.isActive) {
      router.push(tab.route as any);
    }
  };

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      <View
        style={[
          styles.bottomBarContainer,
          {
            marginBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 14 : 10),
          },
        ]}
      >
        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const iconName = tab.isActive ? tab.activeIcon : tab.inactiveIcon;
            const iconColor = tab.isActive ? "#0F172A" : "#334155";

            return (
              <Pressable
                key={tab.id}
                style={styles.tabButton}
                onPress={() => handleTabPress(tab)}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <View style={[styles.iconPill, tab.isActive && styles.iconPillActive]}>
                  <MaterialCommunityIcons
                    name={iconName}
                    size={22}
                    color={iconColor}
                  />
                  {tab.badge ? (
                    tab.badgeCount ? (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>
                          {tab.badgeCount > 9 ? "9+" : tab.badgeCount}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.dotBadge} />
                    )
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    tab.isActive && styles.tabLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 90,
  },
  bottomBarContainer: {
    width: "92%",
    maxWidth: 420,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  iconPill: {
    width: 54,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconPillActive: {
    backgroundColor: "#E8ECEF",
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
    marginTop: 2,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: "#0F172A",
    fontWeight: "800",
  },
  dotBadge: {
    position: "absolute",
    top: 2,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  countBadge: {
    position: "absolute",
    top: -2,
    right: 4,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  countBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
  },
});
