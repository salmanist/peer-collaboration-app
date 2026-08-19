import { router, usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSessionStore } from "../auth/session";
import { useResourceNotificationStore } from "../../features/resources/resourceNotifications";
import { useLostAndFoundNotificationStore } from "../../features/lost_and_found/lostAndFoundNotifications";

interface AppSidebarProps {
  onNavigate?: () => void;
}

const sharePointItems = [
  { label: "Browse Resources", path: "/resources", notification: "resources" },
  { label: "My Resources", path: "/resources/mine" },
  { label: "Request Resources", path: "/resources/wanted" },
  { label: "Interest Requests", path: "/resources/requests", notification: "interest" },
];

const lostAndFoundNavItems = [
  { label: "Lost & Found Feed", path: "/lost-and-found", notification: "items" },
  { label: "Post Notice", path: "/lost-and-found/create" },
  { label: "My Notices & Claims", path: "/lost-and-found/mine", notification: "claims" },
];

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const clearSession = useSessionStore((state) => state.clearSession);
  const hasNewResources = useResourceNotificationStore((state) => state.hasNewResources);
  const hasNewInterestRequests = useResourceNotificationStore((state) => state.hasNewInterestRequests);
  const resetNotifications = useResourceNotificationStore((state) => state.reset);

  const hasNewLostAndFoundItems = useLostAndFoundNotificationStore((state) => state.hasNewItems);
  const hasNewLostAndFoundClaims = useLostAndFoundNotificationStore((state) => state.hasNewClaims);

  const [isSharePointOpen, setIsSharePointOpen] = useState(true);
  const [isLostAndFoundOpen, setIsLostAndFoundOpen] = useState(true);

  const navigate = (path: string) => {
    router.replace(path as any);
    onNavigate?.();
  };

  const logout = async () => {
    await clearSession();
    resetNotifications();
    onNavigate?.();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView
      style={styles.sidebar}
      contentContainerStyle={styles.sidebarContent}
      showsVerticalScrollIndicator={true}
    >
      <Pressable style={styles.logoutButton} onPress={() => void logout()}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      <Text style={styles.brand}>Peer Connect</Text>
      <Text style={styles.caption}>Academic collaboration</Text>

      <View style={styles.navigation}>
        <Pressable style={styles.navigationItem} onPress={() => navigate("/profile")}>
          <Text style={[styles.navigationText, pathname === "/profile" && styles.currentNavigationText]}>Profile</Text>
        </Pressable>

        {/* Share Point Section */}
        <Pressable style={styles.sectionHeaderButton} onPress={() => setIsSharePointOpen((open) => !open)}>
          <Text style={styles.sectionHeaderText}>Share Point</Text>
          <Text style={styles.toggleText}>{isSharePointOpen ? "−" : "+"}</Text>
        </Pressable>

        {isSharePointOpen ? (
          <View style={styles.subLinks}>
            {sharePointItems.map((item) => {
              const isCurrent = pathname === item.path;
              const hasNotification =
                item.notification === "resources"
                  ? hasNewResources
                  : item.notification === "interest" && hasNewInterestRequests;
              return (
                <Pressable
                  key={item.path}
                  style={[styles.navigationItem, isCurrent && styles.currentNavigationItem]}
                  onPress={() => navigate(item.path)}
                >
                  <View style={styles.navigationContent}>
                    <Text style={[styles.navigationText, isCurrent && styles.currentNavigationText]}>
                      {item.label}
                    </Text>
                    {hasNotification ? <View style={styles.notificationDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Lost & Found Section */}
        <Pressable style={styles.sectionHeaderButton} onPress={() => setIsLostAndFoundOpen((open) => !open)}>
          <Text style={styles.sectionHeaderText}>Lost & Found</Text>
          <Text style={styles.toggleText}>{isLostAndFoundOpen ? "−" : "+"}</Text>
        </Pressable>

        {isLostAndFoundOpen ? (
          <View style={styles.subLinks}>
            {lostAndFoundNavItems.map((item) => {
              const isCurrent = pathname === item.path;
              const hasNotification =
                item.notification === "items"
                  ? hasNewLostAndFoundItems
                  : item.notification === "claims" && hasNewLostAndFoundClaims;
              return (
                <Pressable
                  key={item.path}
                  style={[styles.navigationItem, isCurrent && styles.currentNavigationItem]}
                  onPress={() => navigate(item.path)}
                >
                  <View style={styles.navigationContent}>
                    <Text style={[styles.navigationText, isCurrent && styles.currentNavigationText]}>
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
  );
}

const styles = StyleSheet.create({
  sidebar: { backgroundColor: "#ffffff", flex: 1 },
  sidebarContent: { padding: 18, paddingTop: 52, paddingBottom: 40 },
  logoutButton: { alignSelf: "flex-start", borderColor: "#dc2626", borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  logoutText: { color: "#dc2626", fontWeight: "700" },
  brand: { color: "#0f172a", fontSize: 22, fontWeight: "800", marginTop: 28 },
  caption: { color: "#64748b", marginTop: 4 },
  navigation: { gap: 7, marginTop: 30 },
  sectionHeaderButton: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 12, paddingVertical: 10 },
  sectionHeaderText: { color: "#0f172a", fontWeight: "800" },
  toggleText: { color: "#1d4ed8", fontSize: 20, fontWeight: "800" },
  subLinks: { borderLeftColor: "#dbeafe", borderLeftWidth: 2, gap: 5, marginLeft: 12, paddingLeft: 7 },
  navigationItem: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  navigationContent: { alignItems: "center", flexDirection: "row", gap: 8 },
  currentNavigationItem: { backgroundColor: "#dbeafe" },
  navigationText: { color: "#334155", fontWeight: "600" },
  currentNavigationText: { color: "#1d4ed8", fontWeight: "800" },
  notificationDot: { backgroundColor: "#16a34a", borderColor: "#ffffff", borderRadius: 6, borderWidth: 1, height: 11, width: 11 },
});

