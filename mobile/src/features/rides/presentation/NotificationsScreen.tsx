import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { SoftBlock, Card, EmptyState, ScreenContainer, colors, font, spacing, typography, NavClearance } from "../../../core/ui";
import { listNotifications, markNotificationRead, type Notification } from "../data/notificationsApi";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    const data = await listNotifications();
    setNotifications(data.results);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handlePress = async (notification: Notification) => {
    if (notification.is_read) return;
    const updated = await markNotificationRead(notification.id);
    setNotifications((current) => current.map((n) => (n.id === updated.id ? updated : n)));
  };

  return (
    <ScreenContainer style={styles.screen} back="/(app)/rides">
      <FlatList
        ListFooterComponent={NavClearance}
        data={notifications}
        keyExtractor={(notification) => String(notification.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.title}>Notifications</Text>}
        ListEmptyComponent={<EmptyState icon="bell-outline" title="Nothing yet" subtitle="Join request updates will show up here." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePress(item)}>
            <Card style={styles.card} backgroundColor={item.is_read ? colors.surface : colors.primaryFixed} flat={item.is_read}>
              <View style={styles.row}>
                {!item.is_read && <SoftBlock backgroundColor={colors.primary} pill size={8} flat />}
                <Text style={styles.text}>{item.verb}</Text>
              </View>
              <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
            </Card>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  listContent: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginBottom: spacing.xs },
  card: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  text: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink, flex: 1 },
  meta: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
});
