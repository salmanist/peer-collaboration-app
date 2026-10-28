import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OfferedTripCardSkeleton, SkeletonList } from "../../../core/components/Skeleton";
import { formatTime12h, listMyRides, type Ride } from "../data/ridesApi";

function rideStatus(ride: Ride) {
  if (ride.status === "cancelled") return { label: "Cancelled", bg: appColors.red50, text: appColors.danger };
  if (ride.status === "expired") return { label: "Expired", bg: appColors.border, text: appColors.textSecondary };
  if (ride.status === "in_progress") return { label: "In Progress", bg: appColors.surfaceMuted, text: appColors.primary };
  if (ride.status === "completed") return { label: "Completed", bg: appColors.surfaceMuted, text: appColors.primary };
  if (ride.seats_available <= 0) return { label: "Full", bg: appColors.amber50, text: appColors.amber700 };
  return { label: "Open", bg: appColors.surfaceMuted, text: appColors.primary };
}

export default function MyRidesScreen() {
  const insets = useSafeAreaInsets();
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await listMyRides();
      setRides(data.results);
    } catch {
      setLoadError("Couldn't load your trips. The server may be reconnecting. Please retry.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/rides")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
        </Pressable>
        <Text style={styles.topNavTitle}>My Offered Trips</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={rides}
        keyExtractor={(ride) => String(ride.id)}
        ListHeaderComponent={loadError ? (
          <View style={{ padding: 16, gap: 10 }}>
            <Text style={{ color: appColors.textSecondary }}>{loadError}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void load(); }}>
              <Text style={{ color: appColors.primary, fontWeight: "700" }}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        contentContainerStyle={[
          rides.length === 0 ? styles.emptyList : styles.list,
          { paddingBottom: Math.max(insets.bottom + 20, 40) },
        ]}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList
              count={3}
              renderItem={() => <OfferedTripCardSkeleton />}
              contentContainerStyle={{ padding: 16 }}
            />
          ) : loadError ? null : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="car-multiple" size={48} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Trips Offered Yet</Text>
              <Text style={styles.emptySub}>
                Scheduled rides you offer to other students will be tracked here.
              </Text>
              <Pressable
                style={styles.offerBtn}
                onPress={() => router.push("/(app)/rides/offer" as any)}
              >
                <MaterialCommunityIcons name="plus" size={18} color={appColors.white} style={{ marginRight: 6 }} />
                <Text style={styles.offerBtnText}>Offer a Trip</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => {
          const status = rideStatus(item);
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(app)/rides/${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.routeWrap}>
                  <View style={styles.dotStart} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.departure}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={14} color={appColors.textSecondary} style={{ marginHorizontal: 4 }} />
                  <View style={styles.dotEnd} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.destination}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: status.text }]}>{status.label}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="calendar-clock" size={13} color={appColors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.chipText}>
                    {item.departure_date} · {formatTime12h(item.departure_time)}
                  </Text>
                </View>

                <View style={[styles.chip, styles.seatsChip]}>
                  <MaterialCommunityIcons name="seat-passenger" size={13} color={appColors.amber700} style={{ marginRight: 4 }} />
                  <Text style={[styles.chipText, styles.seatsText]}>
                    {item.seats_available}/{item.seats_total} seats
                  </Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.manageHint}>Tap to view passenger join requests</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={appColors.primary} />
              </View>
            </Pressable>
          );
        }}
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
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    backgroundColor: appColors.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 8 + headerGrow,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: appColors.headerBg,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appColors.headerControlBg,
    borderWidth: 1,
    borderColor: appColors.headerControlBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.onHeader,
  },
  list: {
    padding: 16,
    gap: 12,
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
    marginBottom: 16,
  },
  offerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  offerBtnText: {
    color: appColors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  routeWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  dotStart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.emerald500,
    marginRight: 6,
  },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.red500,
    marginRight: 6,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
    maxWidth: "40%",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
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
    backgroundColor: appColors.amber50,
  },
  seatsText: {
    color: appColors.amber700,
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
  manageHint: {
    fontSize: 12,
    color: appColors.textSecondary,
    fontWeight: "500",
  },
});
