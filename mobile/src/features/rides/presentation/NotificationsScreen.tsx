import { colors as appColors } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  ActivityIndicator,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listNotifications, markNotificationRead, type Notification } from "../data/notificationsApi";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listNotifications();
      setNotifications(data.results);
    } catch {
      setError("Couldn't load notifications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handlePress = async (notification: Notification) => {
    if (notification.is_read) return;
    try {
      await markNotificationRead(notification.id);
      setNotifications((current) => current.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
    } catch {
      setError("Couldn't mark this notification as read. Please try again.");
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/rides")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>Ride Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      {!!error && <View style={{ padding: 16, gap: 8 }}>
        <Text accessibilityRole="alert" style={{ color: "#B91C1C" }}>{error}</Text>
        <Pressable onPress={() => void load()}><Text style={{ color: appColors.primary }}>Retry</Text></Pressable>
      </View>}
      <FlatList
        refreshing={isLoading}
        onRefresh={() => void load()}
        data={notifications}
        keyExtractor={(notification) => String(notification.id)}
        contentContainerStyle={[
          notifications.length === 0 ? styles.emptyList : styles.list,
          { paddingBottom: Math.max(insets.bottom + 20, 40) },
        ]}
        ListEmptyComponent={
          isLoading ? <LoadingSkeleton variant="list" /> : error ? null :
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bell-outline" size={48} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Notifications Yet</Text>
            <Text style={styles.emptySub}>
              Updates on your carpools and join requests will show up here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.is_read && styles.unreadCard]}
            onPress={() => handlePress(item)}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, !item.is_read && styles.unreadIconCircle]}>
                <MaterialCommunityIcons
                  name="bell-ring-outline"
                  size={18}
                  color={!item.is_read ? appColors.primary : appColors.textSecondary}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.verbText, !item.is_read && styles.unreadVerbText]}>
                  {item.message}
                </Text>
                <Text style={styles.timeText}>
                  {new Date(item.created_at).toLocaleDateString()} at{" "}
                  {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              {!item.is_read && <View style={styles.unreadDot} />}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  topNavBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.primary,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: appColors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadCard: {
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceMuted,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,


    alignItems: "center",
    justifyContent: "center",
  },
  unreadIconCircle: {

  },
  verbText: {
    fontSize: 13,
    fontWeight: "600",
    color: appColors.textSecondary,
    lineHeight: 18,
  },
  unreadVerbText: {
    color: appColors.text,
    fontWeight: "700",
  },
  timeText: {
    fontSize: 11,
    color: appColors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.primary,
  },
});
