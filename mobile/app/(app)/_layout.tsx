import { Stack } from "expo-router";
import { useEffect } from "react";
import {
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { useSessionStore } from "../../src/core/auth/session";
import AppSidebar from "../../src/core/navigation/AppSidebar";
import { useDrawerStore } from "../../src/core/navigation/drawerStore";
import { fetchMe } from "../../src/features/auth/data/authApi";
import { useResourceNotificationStore } from "../../src/features/resources/resourceNotifications";
import { useLostAndFoundNotificationStore } from "../../src/features/lost_and_found/lostAndFoundNotifications";
import { useTutoringNotificationStore } from "../../src/features/tutoring/tutoringNotifications";
import { RateTutorModal } from "../../src/features/tutoring/presentation/RateTutorModal";

export default function AuthenticatedAppLayout() {
  const { width } = useWindowDimensions();
  const hasPermanentSidebar = width >= 768;
  const user = useSessionStore((state) => state.user);
  const updateUser = useSessionStore((state) => state.updateUser);
  const isMenuOpen = useDrawerStore((state) => state.isMenuOpen);
  const closeDrawer = useDrawerStore((state) => state.closeDrawer);

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
    void checkForUpdates(user.id);
    void pollLostAndFoundSummary();
    void pollTutoringSummary();

    let intervalId: any = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          void checkForUpdates(user.id);
          void pollLostAndFoundSummary();
          void pollTutoringSummary();
        }, 30000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void checkForUpdates(user.id);
        void pollLostAndFoundSummary();
        void pollTutoringSummary();
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [checkForUpdates, pollLostAndFoundSummary, pollTutoringSummary, user]);

  return (
    <View style={styles.root}>
      {hasPermanentSidebar ? <View style={styles.desktopSidebar}><AppSidebar /></View> : null}
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="resources" />
          <Stack.Screen name="lost-and-found/index" />
          <Stack.Screen name="tutoring/index" />
        </Stack>
      </View>

      {!hasPermanentSidebar ? (
        <Modal
          visible={isMenuOpen}
          transparent
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={closeDrawer}
        >
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={closeDrawer} />
            <View style={styles.mobileSidebar}>
              <AppSidebar
                onNavigate={closeDrawer}
                onClose={closeDrawer}
              />
            </View>
          </View>
        </Modal>
      ) : null}

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
  root: { backgroundColor: "#F9FAFC", flex: 1, flexDirection: "row" },
  desktopSidebar: { borderRightColor: "#E2E8F0", borderRightWidth: 1, width: 244, height: "100%" },
  content: { flex: 1 },
  modalRoot: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(7, 13, 31, 0.6)",
    width: "100%",
    height: "100%",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  mobileSidebar: {
    backgroundColor: "#ffffff",
    width: "82%",
    height: "100%",
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 16,
  },
});
