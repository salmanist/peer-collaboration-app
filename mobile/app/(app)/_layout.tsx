import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppState, View } from "react-native";

import { useSessionStore } from "../../src/core/auth/session";
import { BottomNavBar } from "../../src/core/ui/BottomNavBar";
import { colors } from "../../src/core/ui/theme";
import { fetchMe } from "../../src/features/auth/auth";
import { useLostAndFoundNotificationStore } from "../../src/features/lost_and_found/lostAndFoundNotifications";
import CampusNotificationCenterModal from "../../src/features/notifications/presentation/CampusNotificationCenterModal";
import CampusNotificationPopupModal from "../../src/features/notifications/presentation/CampusNotificationPopupModal";
import { useCampusNotificationStore } from "../../src/features/notifications/useCampusNotificationStore";
import { useResourceNotificationStore } from "../../src/features/resources/resourceNotifications";
import { RateTutorModal } from "../../src/features/tutoring/presentation/RateTutorModal";
import { useTutoringNotificationStore } from "../../src/features/tutoring/tutoringNotifications";

const POLL_MS = 45000;

// Same stack options as the root layout. The tab bar floats over the screens
// (absolutely positioned) so content scrolls underneath its glass.
export default function AppLayout() {
  const user = useSessionStore((state) => state.user);
  const updateUser = useSessionStore((state) => state.updateUser);

  const fetchCampusNotifications = useCampusNotificationStore((state) => state.fetchNotifications);
  const checkResourceUpdates = useResourceNotificationStore((state) => state.checkForUpdates);
  const pollLostAndFound = useLostAndFoundNotificationStore((state) => state.pollSummary);
  const pollTutoring = useTutoringNotificationStore((state) => state.pollSummary);
  const unreviewedSession = useTutoringNotificationStore((state) => state.unreviewedSession);
  const dismissUnreviewedSession = useTutoringNotificationStore((state) => state.dismissUnreviewedSession);

  // Refresh the cached profile once per login so roster edits show up.
  useEffect(() => {
    fetchMe().then(updateUser).catch(() => {});
  }, [updateUser]);

  // One shared 45s poll for every module's badge/summary; paused while backgrounded.
  useEffect(() => {
    if (!user) return;
    const pollAll = () => {
      void fetchCampusNotifications();
      void checkResourceUpdates(user.id);
      void pollLostAndFound();
      void pollTutoring();
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!intervalId) intervalId = setInterval(pollAll, POLL_MS);
    };
    const stop = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    };

    pollAll();
    start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        pollAll();
        start();
      } else {
        stop();
      }
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [user, fetchCampusNotifications, checkResourceUpdates, pollLostAndFound, pollTutoring]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "none" }} />
      <BottomNavBar />
      <CampusNotificationPopupModal />
      <CampusNotificationCenterModal />
      <RateTutorModal
        visible={Boolean(unreviewedSession)}
        session={unreviewedSession}
        onClose={dismissUnreviewedSession}
        onSuccess={() => {
          dismissUnreviewedSession();
          void pollTutoring();
        }}
      />
    </View>
  );
}
