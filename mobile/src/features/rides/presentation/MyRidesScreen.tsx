import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, ScreenContainer, colors, font, spacing, typography } from "../../../core/ui";
import { listMyRides, type Ride } from "../data/ridesApi";

function rideStatus(ride: Ride) {
  if (ride.is_cancelled) return { label: "Cancelled", tone: "danger" as const };
  if (ride.seats_available <= 0) return { label: "Full", tone: "tertiary" as const };
  return { label: "Open", tone: "success" as const };
}

export default function MyRidesScreen() {
  const [rides, setRides] = useState<Ride[]>([]);

  const load = useCallback(async () => {
    const data = await listMyRides();
    setRides(data.results);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer style={styles.screen} back="/(app)/rides">
      <FlatList
        data={rides}
        keyExtractor={(ride) => String(ride.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.title}>My Rides</Text>}
        ListEmptyComponent={<EmptyState icon="briefcase-outline" title="No rides posted yet" subtitle="Rides you offer will show up here." />}
        renderItem={({ item }) => {
          const status = rideStatus(item);
          return (
            <Pressable onPress={() => router.push(`/(app)/rides/${item.id}`)}>
              <Card style={styles.rideCard}>
                <View style={styles.rideRow}>
                  <Text style={styles.rideRoute}>{item.departure} → {item.destination}</Text>
                  <Badge label={status.label} tone={status.tone} />
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.rideMeta}>{item.departure_date} · {item.departure_time.slice(0, 5)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="seat-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.rideMeta}>{item.seats_available}/{item.seats_total} seats left</Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  listContent: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginBottom: spacing.xs },
  rideCard: { gap: spacing.xs },
  rideRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rideRoute: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink, flexShrink: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  rideMeta: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
});
