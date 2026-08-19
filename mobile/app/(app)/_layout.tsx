import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { useSessionStore } from "../../src/core/auth/session";
import AppSidebar from "../../src/core/navigation/AppSidebar";
import { useResourceNotificationStore } from "../../src/features/resources/resourceNotifications";
import { useLostAndFoundNotificationStore } from "../../src/features/lost_and_found/lostAndFoundNotifications";

export default function AuthenticatedAppLayout() {
  const { width } = useWindowDimensions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hasPermanentSidebar = width >= 768;
  const user = useSessionStore((state) => state.user);
  const checkForUpdates = useResourceNotificationStore((state) => state.checkForUpdates);
  const pollLostAndFoundSummary = useLostAndFoundNotificationStore((state) => state.pollSummary);

  useEffect(() => {
    if (!user) return;
    void checkForUpdates(user.id);
    void pollLostAndFoundSummary();

    let intervalId: any = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          void checkForUpdates(user.id);
          void pollLostAndFoundSummary();
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
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [checkForUpdates, pollLostAndFoundSummary, user]);

  return (
    <View style={styles.root}>
      {hasPermanentSidebar ? <View style={styles.desktopSidebar}><AppSidebar /></View> : null}
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="profile" />
          <Stack.Screen name="resources" />
          <Stack.Screen name="lost-and-found" />
        </Stack>
      </View>


      {!hasPermanentSidebar ? <>
        <Pressable style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
          <Text style={styles.menuText}>Menu</Text>
        </Pressable>
        <Modal visible={isMenuOpen} transparent animationType="slide" onRequestClose={() => setIsMenuOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={() => setIsMenuOpen(false)} />
            <View style={styles.mobileSidebar}>
              <Pressable style={styles.closeButton} onPress={() => setIsMenuOpen(false)}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
              <AppSidebar onNavigate={() => setIsMenuOpen(false)} />
            </View>
          </View>
        </Modal>
      </> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#f8fafc", flex: 1, flexDirection: "row" },
  desktopSidebar: { borderRightColor: "#e2e8f0", borderRightWidth: 1, width: 244, height: "100%" },
  content: { flex: 1 },
  menuButton: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, position: "absolute", right: 18, top: 18, zIndex: 5 },
  menuText: { color: "#1d4ed8", fontWeight: "800" },
  modalRoot: { flex: 1, flexDirection: "row" },
  backdrop: { backgroundColor: "rgba(15, 23, 42, 0.45)", flex: 1 },
  mobileSidebar: { backgroundColor: "#ffffff", bottom: 0, left: 0, position: "absolute", top: 0, width: "78%", display: "flex", flexDirection: "column" },

  closeButton: { alignSelf: "flex-end", marginRight: 18, marginTop: 20, padding: 8 },
  closeText: { color: "#1d4ed8", fontWeight: "800" },
});
