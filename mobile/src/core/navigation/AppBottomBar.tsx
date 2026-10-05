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

  // Normalize pathname by stripping group prefixes and trailing slashes
  const cleanPath = pathname.replace(/^\/\(app\)/, "").replace(/\/$/, "");

  // Only show the bottom navigation bar on primary root tab screens
  // All sub-screens with back arrows (e.g. My Listings, Create, Details, Chat) will hide the bottom bar
  const isMainTabScreen =
    cleanPath === "" ||
    cleanPath === "/" ||
    cleanPath === "/index" ||
    cleanPath === "/resources" ||
    cleanPath === "/resources/index" ||
    cleanPath === "/lost-and-found" ||
    cleanPath === "/lost-and-found/index" ||
    cleanPath === "/tutoring" ||
    cleanPath === "/tutoring/index" ||
    cleanPath === "/profile";

  if (!isMainTabScreen) {
    return null;
  }

  const isHome = cleanPath === "" || cleanPath === "/" || cleanPath === "/index";
  const isResources = cleanPath.startsWith("/resources");
  const isLostAndFound = cleanPath.startsWith("/lost-and-found");
  const isTutoring = cleanPath.startsWith("/tutoring");

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
            const iconColor = tab.isActive ? "#0D3E02" : "#64748B";

            return (
              <Pressable
                key={tab.id}
                style={[
                  styles.tabButton,
                  tab.isActive && styles.tabButtonActive,
                ]}
                onPress={() => handleTabPress(tab)}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons
                    name={iconName}
                    size={23}
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
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.85)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
    paddingHorizontal: 1,
    borderRadius: 18,
  },
  tabButtonActive: {
    backgroundColor: "rgba(13, 62, 2, 0.08)",
  },
  iconContainer: {
    position: "relative",
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: "#0D3E02",
    fontWeight: "800",
  },
  dotBadge: {
    position: "absolute",
    top: -1,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#16A34A",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  countBadge: {
    position: "absolute",
    top: -3,
    right: -6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#0D3E02",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  countBadgeText: {
    color: "#FDBF1E",
    fontSize: 8,
    fontWeight: "900",
    lineHeight: 10,
  },
});
