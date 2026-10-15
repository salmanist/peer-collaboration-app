import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, ScreenContainer, Skeleton, colors, font, spacing, typography, NavClearance } from "../../../core/ui";
import { formatTime12h, listMyRides, type Ride } from "../data/ridesApi";

function rideStatus(ride: Ride) {
  if (ride.status === "cancelled") return { label: "Cancelled", tone: "danger" as const };
  if (ride.status === "expired") return { label: "Expired", tone: "neutral" as const };
  if (ride.status === "in_progress") return { label: "In progress", tone: "primary" as const };
  if (ride.status === "completed") return { label: "Completed", tone: "success" as const };
  if (ride.seats_available <= 0) return { label: "Full", tone: "tertiary" as const };
  return { label: "Open", tone: "success" as const };
}

function RideSkeletonCard() {
  return (
    <Card style={styles.rideCard}>
      <Skeleton style={styles.skeletonTitle} />
      <Skeleton style={styles.skeletonLine} />
      <Skeleton style={styles.skeletonLineShort} />
    </Card>
  );
}

export default function MyRidesScreen() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listMyRides();
      setRides(data.results);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer style={styles.screen} back="/(app)/rides">
      <FlatList
        ListFooterComponent={NavClearance}
        data={rides}
        keyExtractor={(ride) => String(ride.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.title}>My Rides</Text>}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonList}>
              <RideSkeletonCard />
              <RideSkeletonCard />
              <RideSkeletonCard />
            </View>
          ) : (
            <EmptyState icon="briefcase-outline" title="No rides posted yet" subtitle="Rides you offer will show up here." />
          )
        }
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
                  <Text style={styles.rideMeta}>{item.departure_date} · {formatTime12h(item.departure_time)}</Text>
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
  skeletonList: { gap: spacing.md },
  skeletonTitle: { width: "70%", height: 16 },
  skeletonLine: { width: "55%", height: 12, marginTop: spacing.xs },
  skeletonLineShort: { width: "40%", height: 12 },
});
