import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, Skeleton, colors, font, spacing, typography } from "../../../core/ui";
import { formatTime12h, type Ride } from "../data/ridesApi";

// One scheduled trip in a list; tapping opens its detail screen.
export function TripCard({ ride }: { ride: Ride }) {
  return (
    <Pressable onPress={() => router.push(`/(app)/rides/${ride.id}`)}>
      <Card style={styles.rideCard}>
        <View style={styles.rideRow}>
          <Text style={styles.rideRoute}>{ride.departure} → {ride.destination}</Text>
          {ride.same_gender_only && <Badge label="Same gender" tone="tertiary" />}
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.rideMeta}>{ride.departure_date} · {formatTime12h(ride.departure_time)}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="seat-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.rideMeta}>{ride.seats_available}/{ride.seats_total} seats left · {ride.offerer.full_name}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

// Shaped like a real trip Card - shown in place of the list while the very first fetch
// (no cached/previous trips to keep displaying) is in flight.
export function TripSkeletonList() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((index) => (
        <Card key={index} style={styles.rideCard}>
          <Skeleton style={styles.skeletonTitle} />
          <Skeleton style={styles.skeletonLine} />
          <Skeleton style={styles.skeletonLineShort} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
