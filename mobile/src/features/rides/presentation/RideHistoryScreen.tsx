import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../../core/ui/AppText";
import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { listRideHistory, type RideHistory } from "../data/ridesApi";
import { TripCard } from "./TripCard";
import { useSessionStore } from "../../../core/auth/session";

export default function RideHistoryScreen() {
  const insets = useSafeAreaInsets();
  const currentUser = useSessionStore((state) => state.user);
  const [data, setData] = useState<RideHistory | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setError("");
      listRideHistory()
        .then((result) => {
          if (mounted) setData(result);
        })
        .catch(() => {
          if (mounted) setError("Couldn't load ride history.");
        });
      return () => {
        mounted = false;
      };
    }, [retry]),
  );

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => goBack("/(app)/rides")}
          accessibilityLabel="Back"
          hitSlop={10}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ride Travel History</Text>
          <Text style={styles.subtitle}>Rides you completed or travelled on</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}>
        {!!error && (
          <Pressable style={styles.errorBox} onPress={() => setRetry((value) => value + 1)}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.danger} />
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </Pressable>
        )}

        {!data && !error ? (
          <LoadingSkeleton variant="list" />
        ) : data ? (
          <>
            {/* Scheduled Carpools Section */}
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="calendar-check" size={18} color={appColors.primary} />
              <Text style={styles.sectionTitle}>Scheduled Rides</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{data.scheduled.length}</Text>
              </View>
            </View>

            {data.scheduled.length ? (
              data.scheduled.map((ride) => {
                const isOfferer = ride.offerer.id === currentUser?.id;
                const partnerText = isOfferer
                  ? "You drove"
                  : `Travelled with: ${ride.offerer.full_name || "Campus Driver"}`;
                return (
                  <View key={ride.id} style={styles.tripWrap}>
                    <View style={styles.travelWithBar}>
                      <MaterialCommunityIcons
                        name={isOfferer ? "steering" : "account-check"}
                        size={14}
                        color={appColors.primary}
                      />
                      <Text style={styles.travelWithText}>{partnerText}</Text>
                    </View>
                    <TripCard ride={ride} />
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No completed scheduled rides yet.</Text>
              </View>
            )}

            {/* Real-time Rides Section */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={18} color={appColors.warning} />
              <Text style={styles.sectionTitle}>Real-time Campus Lifts</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{data.realtime.length}</Text>
              </View>
            </View>

            {data.realtime.length ? (
              data.realtime.map((ride) => (
                <View key={ride.id} style={styles.realtimeCard}>
                  <View style={styles.realtimeTopRow}>
                    <View style={styles.roleBadge}>
                      <MaterialCommunityIcons
                        name={ride.role === "Passenger" ? "human-greeting" : "car"}
                        size={13}
                        color={appColors.primary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.roleBadgeText}>{ride.role}</Text>
                    </View>
                    <Text style={styles.dateText}>
                      {new Date(ride.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.routeRow}>
                    <MaterialCommunityIcons name="navigation-variant" size={16} color={appColors.primary} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      {ride.pickup} → {ride.destination}
                    </Text>
                  </View>

                  {!!ride.partner_name && (
                    <View style={styles.partnerRow}>
                      <MaterialCommunityIcons name="account-circle-outline" size={14} color={appColors.textSecondary} />
                      <Text style={styles.partnerText}>
                        Travelled with: <Text style={{ fontWeight: "700", color: appColors.text }}>{ride.partner_name}</Text>
                      </Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No real-time lift travel history yet.</Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: appColors.white,
  },
  header: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12 + headerGrow,
    backgroundColor: appColors.headerBg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appColors.headerControlBg,
    borderWidth: 1,
    borderColor: appColors.headerControlBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: appColors.onHeader,
  },
  subtitle: {
    fontSize: 12,
    color: appColors.onHeaderMuted,
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: appColors.red50,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
  },
  errorText: {
    fontSize: 13,
    color: appColors.danger,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: appColors.text,
  },
  countBadge: {
    backgroundColor: appColors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.textSecondary,
  },
  tripWrap: {
    marginBottom: 12,
  },
  travelWithBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: appColors.surfaceMuted,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: appColors.border,
  },
  travelWithText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.primary,
  },
  realtimeCard: {
    backgroundColor: appColors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.border,
    marginBottom: 10,
    gap: 8,
  },
  realtimeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
  },
  dateText: {
    fontSize: 11,
    color: appColors.textMuted,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
    flex: 1,
  },
  partnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderColor: appColors.border,
  },
  partnerText: {
    fontSize: 12,
    color: appColors.textSecondary,
  },
  emptyBox: {
    padding: 16,
    backgroundColor: appColors.surfaceMuted,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.border,
  },
  emptyText: {
    fontSize: 12,
    color: appColors.textSecondary,
  },
});
