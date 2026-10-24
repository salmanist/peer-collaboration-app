import { colors as appColors } from "../ui/theme";
import { Text } from "../ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSessionStore } from "../auth/session";
import { useResourceNotificationStore } from "../../features/resources/resourceNotifications";
import { useLostAndFoundNotificationStore } from "../../features/lost_and_found/lostAndFoundNotifications";
import { useTutoringNotificationStore } from "../../features/tutoring/tutoringNotifications";

interface AppSidebarProps {
  onNavigate?: () => void;
  onClose?: () => void;
}

export default function AppSidebar({ onNavigate, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);

  const hasNewResources = useResourceNotificationStore((state) => state.hasNewResources);
  const hasNewInterestRequests = useResourceNotificationStore((state) => state.hasNewInterestRequests);
  const hasNewClaims = useLostAndFoundNotificationStore((state) => state.hasNewClaims);
  const hasNewLostItems = useLostAndFoundNotificationStore((state) => state.hasNewItems);
  const pendingTutoringRequests = useTutoringNotificationStore((state) => state.pendingRequestsCount);
  const hasActiveTutorProfile = useTutoringNotificationStore((state) => state.hasActiveTutorProfile);

  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(true);
  const [isLostFoundOpen, setIsLostFoundOpen] = useState(true);
  const [isTutoringOpen, setIsTutoringOpen] = useState(true);

  const navigate = (path: string) => {
    router.push(path as any);
    onNavigate?.();
  };

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  const isAdmin =
    user?.role === "admin" ||
    (user?.email && ["salman@lgu.edu.pk", "zahra@lgu.edu.pk"].includes(user.email.toLowerCase()));

  const marketplaceItems = [
    { label: "Marketplace Feed", path: "/resources", notification: "resources", icon: "storefront-outline" as const },
    { label: "My Listings & Requests", path: "/resources/mine", notification: "none", icon: "format-list-bulleted" as const },
    { label: "Interest Requests", path: "/resources/requests", notification: "interest", icon: "hand-coin-outline" as const },
  ];

  const lostFoundItems = [
    { label: "Lost & Found Feed", path: "/lost-and-found", notification: "items", icon: "magnify" as const },
    { label: "My Notices", path: "/lost-and-found/mine", notification: "claims", icon: "clipboard-list-outline" as const },
  ];

  const tutoringItems = [
    { label: "Find Tutors & Mentors", path: "/tutoring", notification: "none", icon: "account-search-outline" as const },
    { label: hasActiveTutorProfile ? "Edit Tutor Profile" : "Become a Peer Tutor", path: "/tutoring/setup", notification: "none", icon: "school-outline" as const },
    { label: "Study & Project Collabs", path: "/tutoring/collaborations", notification: "none", icon: "account-group-outline" as const },
    { label: "My Tutoring Sessions", path: "/tutoring/sessions/mine", notification: "sessions", icon: "calendar-account-outline" as const },
  ];

  return (
    <View style={styles.sidebarWrapper}>
      <ScrollView
        style={styles.sidebar}
        contentContainerStyle={[
          styles.sidebarContent,
          {
            paddingTop: topOffset + 12,
            paddingBottom: Math.max(insets.bottom + 20, 30),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: Brand + Close Button */}
        <View style={styles.headerRow}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brand}>Fello</Text>
              <View style={styles.brandDot} />
            </View>
            <Text style={styles.caption}>Lahore Garrison University</Text>
          </View>

          {onClose ? (
            <Pressable style={styles.closeCircleBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={18} color={appColors.primary} />
            </Pressable>
          ) : null}
        </View>

        {/* Main Nav Links */}
        <View style={styles.navigation}>
          {/* Admin Center Link (Visible ONLY for Salman & Zahra) */}
          {isAdmin ? (
            <Pressable
              style={[
                styles.adminNavItem,
                pathname === "/admin" && styles.adminNavItemActive,
              ]}
              onPress={() => navigate("/admin")}
            >
              <View style={styles.navigationContent}>
                <View style={styles.adminIconBox}>
                  <MaterialCommunityIcons
                    name="shield-crown"
                    size={16}
                    color={appColors.gold}
                  />
                </View>
                <Text style={styles.adminNavText}>Admin Center</Text>
              </View>
              <View style={styles.adminNavTag}>
                <Text style={styles.adminNavTagText}>ADMIN</Text>
              </View>
            </Pressable>
          ) : null}

          {/* Home */}
          <Pressable
            style={[
              styles.navigationItem,
              (pathname === "/" || pathname === "" || pathname === "/(app)") && styles.currentNavigationItem,
            ]}
            onPress={() => navigate("/")}
          >
            <View style={styles.navigationContent}>
              <View
                style={[
                  styles.navIconBox,
                  (pathname === "/" || pathname === "" || pathname === "/(app)") && styles.navIconBoxActive,
                ]}
              >
                <MaterialCommunityIcons
                  name="home-variant-outline"
                  size={18}
                  color={(pathname === "/" || pathname === "" || pathname === "/(app)") ? appColors.primary : appColors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.navigationText,
                  (pathname === "/" || pathname === "" || pathname === "/(app)") && styles.currentNavigationText,
                ]}
              >
                Home Feed
              </Text>
            </View>
          </Pressable>

          {/* Profile */}
          <Pressable
            style={[styles.navigationItem, pathname === "/profile" && styles.currentNavigationItem]}
            onPress={() => navigate("/profile")}
          >
            <View style={styles.navigationContent}>
              <View
                style={[
                  styles.navIconBox,
                  pathname === "/profile" && styles.navIconBoxActive,
                ]}
              >
                <MaterialCommunityIcons
                  name="account-outline"
                  size={18}
                  color={pathname === "/profile" ? appColors.primary : appColors.textSecondary}
                />
              </View>
              <Text style={[styles.navigationText, pathname === "/profile" && styles.currentNavigationText]}>
                My Profile
              </Text>
            </View>
          </Pressable>

          {/* Digital Library */}
          <Pressable
            style={[styles.navigationItem, pathname.startsWith("/library") && styles.currentNavigationItem]}
            onPress={() => navigate("/library")}
          >
            <View style={styles.navigationContent}>
              <View
                style={[
                  styles.navIconBox,
                  pathname.startsWith("/library") && styles.navIconBoxActive,
                ]}
              >
                <MaterialCommunityIcons
                  name="book-open-page-variant-outline"
                  size={18}
                  color={pathname.startsWith("/library") ? appColors.primary : appColors.textSecondary}
                />
              </View>
              <Text style={[styles.navigationText, pathname.startsWith("/library") && styles.currentNavigationText]}>
                Digital Library
              </Text>
            </View>
          </Pressable>

          {/* Ride Share */}
          <Pressable
            style={[styles.navigationItem, pathname.startsWith("/rides") && styles.currentNavigationItem]}
            onPress={() => navigate("/rides")}
          >
            <View style={styles.navigationContent}>
              <View
                style={[
                  styles.navIconBox,
                  pathname.startsWith("/rides") && styles.navIconBoxActive,
                ]}
              >
                <MaterialCommunityIcons
                  name="car-multiple"
                  size={18}
                  color={pathname.startsWith("/rides") ? appColors.primary : appColors.textSecondary}
                />
              </View>
              <Text style={[styles.navigationText, pathname.startsWith("/rides") && styles.currentNavigationText]}>
                Ride Share
              </Text>
            </View>
          </Pressable>

          {/* Print Center */}
          <Pressable
            style={[styles.navigationItem, pathname.startsWith("/printing") && styles.currentNavigationItem]}
            onPress={() => navigate("/printing")}
          >
            <View style={styles.navigationContent}>
              <View
                style={[
                  styles.navIconBox,
                  pathname.startsWith("/printing") && styles.navIconBoxActive,
                ]}
              >
                <MaterialCommunityIcons
                  name="printer-outline"
                  size={18}
                  color={pathname.startsWith("/printing") ? appColors.primary : appColors.textSecondary}
                />
              </View>
              <Text style={[styles.navigationText, pathname.startsWith("/printing") && styles.currentNavigationText]}>
                Print Center
              </Text>
            </View>
          </Pressable>

          {/* University Assistant */}
          <Pressable
            style={[styles.navigationItem, pathname === "/chatbot" && styles.currentNavigationItem]}
            onPress={() => navigate("/chatbot")}
          >
            <View style={styles.navigationContent}>
              <View style={styles.navIconBox}>
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={18}
                  color={pathname === "/chatbot" ? appColors.primary : appColors.textSecondary}
                />
              </View>
              <Text style={[styles.navigationText, pathname === "/chatbot" && styles.currentNavigationText]}>
                University Assistant
              </Text>
            </View>
          </Pressable>

          {/* Section: Peer Tutoring */}
          <Pressable
            style={styles.sectionHeaderButton}
            onPress={() => setIsTutoringOpen((open) => !open)}
          >
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconBadge}>
                <MaterialCommunityIcons name="school-outline" size={14} color={appColors.primary} />
              </View>
              <Text style={styles.sectionHeaderText}>Peer Tutoring</Text>
            </View>
            <MaterialCommunityIcons
              name={isTutoringOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={appColors.textSecondary}
            />
          </Pressable>

          {isTutoringOpen ? (
            <View style={styles.subLinks}>
              {tutoringItems.map((item) => {
                const isCurrent = pathname === item.path;
                const hasNotification =
                  item.notification === "sessions" && pendingTutoringRequests > 0;
                return (
                  <Pressable
                    key={item.path}
                    style={[styles.subNavigationItem, isCurrent && styles.currentSubNavigationItem]}
                    onPress={() => navigate(item.path)}
                  >
                    <View style={styles.navigationContent}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={16}
                        color={isCurrent ? appColors.primary : appColors.textSecondary}
                      />
                      <Text style={[styles.subNavigationText, isCurrent && styles.currentSubNavigationText]}>
                        {item.label}
                      </Text>
                      {hasNotification ? <View style={styles.notificationDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Section: Marketplace */}
          <Pressable
            style={styles.sectionHeaderButton}
            onPress={() => setIsMarketplaceOpen((open) => !open)}
          >
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconBadge}>
                <MaterialCommunityIcons name="store-outline" size={14} color={appColors.primary} />
              </View>
              <Text style={styles.sectionHeaderText}>Resource Marketplace</Text>
            </View>
            <MaterialCommunityIcons
              name={isMarketplaceOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={appColors.textSecondary}
            />
          </Pressable>

          {isMarketplaceOpen ? (
            <View style={styles.subLinks}>
              {marketplaceItems.map((item) => {
                const isCurrent = pathname === item.path;
                const hasNotification =
                  (item.notification === "resources" && hasNewResources) ||
                  (item.notification === "interest" && hasNewInterestRequests);
                return (
                  <Pressable
                    key={item.path}
                    style={[styles.subNavigationItem, isCurrent && styles.currentSubNavigationItem]}
                    onPress={() => navigate(item.path)}
                  >
                    <View style={styles.navigationContent}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={16}
                        color={isCurrent ? appColors.primary : appColors.textSecondary}
                      />
                      <Text style={[styles.subNavigationText, isCurrent && styles.currentSubNavigationText]}>
                        {item.label}
                      </Text>
                      {hasNotification ? <View style={styles.notificationDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Section: Lost & Found */}
          <Pressable
            style={styles.sectionHeaderButton}
            onPress={() => setIsLostFoundOpen((open) => !open)}
          >
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconBadge}>
                <MaterialCommunityIcons name="magnify" size={14} color={appColors.primary} />
              </View>
              <Text style={styles.sectionHeaderText}>Lost & Found</Text>
            </View>
            <MaterialCommunityIcons
              name={isLostFoundOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={appColors.textSecondary}
            />
          </Pressable>

          {isLostFoundOpen ? (
            <View style={styles.subLinks}>
              {lostFoundItems.map((item) => {
                const isCurrent = pathname === item.path;
                const hasNotification =
                  (item.notification === "claims" && hasNewClaims) ||
                  (item.notification === "items" && hasNewLostItems);
                return (
                  <Pressable
                    key={item.path}
                    style={[styles.subNavigationItem, isCurrent && styles.currentSubNavigationItem]}
                    onPress={() => navigate(item.path)}
                  >
                    <View style={styles.navigationContent}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={16}
                        color={isCurrent ? appColors.primary : appColors.textSecondary}
                      />
                      <Text style={[styles.subNavigationText, isCurrent && styles.currentSubNavigationText]}>
                        {item.label}
                      </Text>
                      {hasNotification ? <View style={styles.notificationDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebarWrapper: {
    flex: 1,
    backgroundColor: appColors.white,
  },
  sidebar: {
    flex: 1,
  },
  sidebarContent: {
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brand: {
    color: appColors.primary,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  brandAccent: {
    color: appColors.primary,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: appColors.gold,
  },
  caption: {
    color: appColors.textSecondary,
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
  },
  closeCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: appColors.background,
    borderWidth: 1,
    borderColor: appColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navigation: {
    gap: 4,
  },
  adminNavItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: appColors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  adminNavItemActive: {
    backgroundColor: appColors.primaryDark,
  },
  adminIconBox: {
    width: 26,
    height: 26,


    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  adminNavText: {
    color: appColors.white,
    fontWeight: "800",
    fontSize: 13,
  },
  adminNavTag: {
    backgroundColor: appColors.goldA18,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  adminNavTagText: {
    color: appColors.gold,
    fontWeight: "800",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  navigationItem: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currentNavigationItem: {
    backgroundColor: appColors.surfaceMuted,
  },
  navigationContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  navIconBox: {
    width: 30,
    height: 30,


    alignItems: "center",
    justifyContent: "center",
  },
  navIconBoxActive: {

  },
  navigationText: {
    color: appColors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  currentNavigationText: {
    color: appColors.primary,
    fontWeight: "900",
  },
  sectionHeaderButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIconBadge: {
    width: 24,
    height: 24,


    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderText: {
    color: appColors.primary,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: -0.2,
  },
  subLinks: {
    paddingLeft: 16,
    gap: 2,
    marginVertical: 2,
  },
  subNavigationItem: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  currentSubNavigationItem: {
    backgroundColor: appColors.border,
  },
  subNavigationText: {
    color: appColors.textSecondary,
    fontWeight: "600",
    fontSize: 12,
  },
  currentSubNavigationText: {
    color: appColors.primary,
    fontWeight: "800",
  },
  notificationDot: {
    backgroundColor: appColors.gold,
    borderColor: appColors.primary,
    borderRadius: 5,
    borderWidth: 1,
    height: 9,
    width: 9,
    marginLeft: "auto",
  },
});
