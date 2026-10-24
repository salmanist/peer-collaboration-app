import { colors as appColors } from "../../src/core/ui/theme";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  AppState,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { useSessionStore } from "../../src/core/auth/session";
import AppSidebar from "../../src/core/navigation/AppSidebar";
import AppBottomBar from "../../src/core/navigation/AppBottomBar";
import { fetchMe } from "../../src/features/auth/data/authApi";
import { useResourceNotificationStore } from "../../src/features/resources/resourceNotifications";
import { useLostAndFoundNotificationStore } from "../../src/features/lost_and_found/lostAndFoundNotifications";
import { useTutoringNotificationStore } from "../../src/features/tutoring/tutoringNotifications";
import { useCampusNotificationStore } from "../../src/features/notifications/useCampusNotificationStore";
import { RateTutorModal } from "../../src/features/tutoring/presentation/RateTutorModal";
import CampusNotificationCenterModal from "../../src/features/notifications/presentation/CampusNotificationCenterModal";
import CampusNotificationPopupModal from "../../src/features/notifications/presentation/CampusNotificationPopupModal";

import { useModuleUsageStore, ModuleKey } from "../../src/core/store/useModuleUsageStore";

export default function AuthenticatedAppLayout() {
  const pathname = usePathname();
  useEffect(() => {
    const segment = pathname.split("/").find(part => ["tutoring", "resources", "lost-and-found", "library", "rides", "ondemand", "printing"].includes(part));
    const modules: Record<string, ModuleKey> = { tutoring: "tutoring", resources: "marketplace", "lost-and-found": "lost_and_found", library: "library", rides: "ride_sharing", ondemand: "ride_sharing", printing: "print_center" };
    if (segment) useModuleUsageStore.getState().recordVisit(modules[segment]);
  }, [pathname]);

  const { width } = useWindowDimensions();
  const hasPermanentSidebar = width >= 768;
  const user = useSessionStore((state) => state.user);
  const updateUser = useSessionStore((state) => state.updateUser);

  const fetchCampusNotifications = useCampusNotificationStore((state) => state.fetchNotifications);
  const checkForUpdates = useResourceNotificationStore((state) => state.checkForUpdates);
  const pollLostAndFoundSummary = useLostAndFoundNotificationStore((state) => state.pollSummary);
  const pollTutoringSummary = useTutoringNotificationStore((state) => state.pollSummary);
  const unreviewedSession = useTutoringNotificationStore((state) => state.unreviewedSession);
  const dismissUnreviewedSession = useTutoringNotificationStore((state) => state.dismissUnreviewedSession);

  useEffect(() => {
    fetchMe()
      .then((me) => updateUser(me))
      .catch(() => {});
  }, [updateUser]);

  useEffect(() => {
    if (!user) return;
    const pollAll = () => {
      void fetchCampusNotifications();
      void checkForUpdates(user.id);
      void pollLostAndFoundSummary();
      void pollTutoringSummary();
    };

    pollAll();

    let intervalId: any = setInterval(pollAll, 45000);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        pollAll();
        if (!intervalId) intervalId = setInterval(pollAll, 45000);
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      subscription.remove();
    };
  }, [checkForUpdates, pollLostAndFoundSummary, pollTutoringSummary, fetchCampusNotifications, user]);

  return (
    <View style={[styles.root, hasPermanentSidebar ? styles.rootRow : styles.rootColumn]}>
      {hasPermanentSidebar ? (
        <View style={styles.desktopSidebar}>
          <AppSidebar />
        </View>
      ) : null}

      <StatusBar style="light" />
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="resources" />
          <Stack.Screen name="lost-and-found" />
          <Stack.Screen name="tutoring" />
          <Stack.Screen name="library" />
          <Stack.Screen name="rides" />
          <Stack.Screen name="printing" />
          <Stack.Screen name="ondemand" />
          <Stack.Screen name="chatbot" />
        </Stack>
      </View>

      {!hasPermanentSidebar ? <AppBottomBar /> : null}

      <CampusNotificationPopupModal />
      <CampusNotificationCenterModal />

      <RateTutorModal
        visible={Boolean(unreviewedSession)}
        session={unreviewedSession}
        onClose={dismissUnreviewedSession}
        onSuccess={() => {
          dismissUnreviewedSession();
          void pollTutoringSummary();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: appColors.background, flex: 1 },
  rootRow: { flexDirection: "row" },
  rootColumn: { flexDirection: "column" },
  desktopSidebar: { borderRightColor: appColors.border, borderRightWidth: 1, width: 244, height: "100%" },
  content: { flex: 1 },
});
