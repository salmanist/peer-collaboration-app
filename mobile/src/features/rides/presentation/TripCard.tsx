import { colors as appColors } from "../../../core/ui/theme";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { OfferedTripCardSkeleton, SkeletonList } from "../../../core/components/Skeleton";
import { useSessionStore } from "../../../core/auth/session";
import { formatTime12h, type Ride } from "../data/ridesApi";

export function TripCard({ ride }: { ride: Ride }) {
  const userId = useSessionStore(state => state.user?.id);
  const isMine = ride.offerer.id === userId;
  const pendingCount = ride.pending_request_count || 0;
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(app)/rides/${ride.id}`)}
    >
      {isMine && <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: appColors.primary }}>You posted</Text>
        {pendingCount > 0 && <View accessibilityLabel={`${pendingCount} pending join requests`} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <MaterialCommunityIcons name="bell-outline" size={15} color={appColors.primary} />
          <View style={{ backgroundColor: "#DC2626", borderRadius: 10, minWidth: 20, paddingHorizontal: 5, paddingVertical: 2 }}><Text style={{ color: "#FFFFFF", fontSize: 11, textAlign: "center", fontWeight: "700" }}>{pendingCount}</Text></View>
        </View>}
      </View>}
      {/* Route Row */}
      <View style={styles.topRow}>
        <View style={styles.routeWrap}>
          <View style={styles.dotStart} />
          <Text style={styles.departureText} numberOfLines={1}>
            {ride.departure}
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={appColors.textSecondary} style={{ marginHorizontal: 4 }} />
          <View style={styles.dotEnd} />
          <Text style={styles.destinationText} numberOfLines={1}>
            {ride.destination}
          </Text>
        </View>

        {ride.same_gender_only && (
          <View style={styles.genderBadge}>
            <MaterialCommunityIcons name="account-group" size={12} color={appColors.icon} style={{ marginRight: 3 }} />
            <Text style={styles.genderBadgeText}>Same Gender</Text>
          </View>
        )}
      </View>

      {/* Date & Seats Row */}
      <View style={styles.detailsRow}>
        <View style={styles.chip}>
          <MaterialCommunityIcons name="calendar-clock" size={13} color={appColors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.chipText}>
            {ride.departure_date} · {formatTime12h(ride.departure_time)}
          </Text>
        </View>

        <View style={[styles.chip, styles.seatsChip]}>
          <MaterialCommunityIcons name="seat-passenger" size={13} color="#B45309" style={{ marginRight: 4 }} />
          <Text style={[styles.chipText, styles.seatsText]}>
            {ride.seats_available}/{ride.seats_total} seats left
          </Text>
        </View>
      </View>

      {/* Offerer / Driver Footer */}
      <View style={styles.footerRow}>
        <View style={styles.driverInfo}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="account" size={14} color={appColors.primary} />
          </View>
          <Text style={styles.driverName} numberOfLines={1}>
            {ride.offerer.full_name}
          </Text>
        </View>

        <View style={styles.viewDetailsBtn}>
          <Text style={styles.viewDetailsText}>{isMine ? "Manage Trip" : "View Trip"}</Text>
          <MaterialCommunityIcons name="arrow-right" size={14} color={appColors.primary} style={{ marginLeft: 4 }} />
        </View>
      </View>
    </Pressable>
  );
}

export function TripSkeletonList() {
  return (
    <SkeletonList
      count={3}
      renderItem={() => <OfferedTripCardSkeleton />}
      contentContainerStyle={{ padding: 0 }}
    />
  );
}


const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  routeWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  dotStart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    marginRight: 6,
  },
  departureText: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
    maxWidth: "40%",
  },
  destinationText: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
    maxWidth: "40%",
  },
  genderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  genderBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.icon,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.primary,
  },
  seatsChip: {
    backgroundColor: "#FFFBEB",
  },
  seatsText: {
    color: "#B45309",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingTop: 8,
    marginTop: 2,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: appColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "800",
    color: appColors.primary,
  },
  skeletonList: {
    gap: 10,
  },
  skeletonRoute: {
    width: "75%",
    height: 16,
    backgroundColor: appColors.border,
    borderRadius: 4,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 8,
  },
  skeletonChip: {
    width: 120,
    height: 22,
    backgroundColor: appColors.border,
    borderRadius: 8,
  },
  skeletonChipSmall: {
    width: 80,
    height: 22,
    backgroundColor: appColors.border,
    borderRadius: 8,
  },
  skeletonFooter: {
    width: "50%",
    height: 14,
    backgroundColor: appColors.border,
    borderRadius: 4,
    marginTop: 4,
  },
});
