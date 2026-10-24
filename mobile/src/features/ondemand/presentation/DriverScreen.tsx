import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { Text } from "../../../core/ui/AppText";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { sendHeartbeat } from "../data/driverLocation";
import {
  getCurrentRide,
  getMyRideProfile,
  listNearbyRequests,
  rideAction,
  setDriverStatus,
  type OnDemandRide,
  type RideProfile,
} from "../data/ondemandApi";
import { usePolling } from "./usePolling";

export default function DriverScreen() {
  const insets = useSafeAreaInsets();
  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [profile, setProfile] = useState<RideProfile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState<OnDemandRide[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/rides" as any);
    }
  };

  useEffect(() => {
    getMyRideProfile()
      .then((loaded) => {
        setProfile(loaded);
        setIsOnline(!!loaded?.is_online);
      })
      .catch(() => setError("Couldn't load your driver profile."));
  }, []);

  usePolling(
    useCallback(async () => {
      if (!isOnline) return;
      const heartbeatError = await sendHeartbeat();
      setError(heartbeatError);
      if (heartbeatError) return;
      try {
        if (await getCurrentRide()) {
          router.replace("/(app)/ondemand/ride");
          return;
        }
        setRequests(await listNearbyRequests());
      } catch {
        setError("Couldn't refresh requests. Check your connection.");
      }
    }, [isOnline]),
  );

  const toggleOnline = async (wantOnline: boolean) => {
    setError(null);
    setIsToggling(true);
    if (wantOnline) {
      const heartbeatError = await sendHeartbeat();
      if (heartbeatError) {
        setError(heartbeatError);
        setIsToggling(false);
      } else {
        setIsOnline(true);
        setIsToggling(false);
      }
      return;
    }
    try {
      await setDriverStatus(false);
      setIsOnline(false);
      setRequests([]);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't go offline.");
    } finally {
      setIsToggling(false);
    }
  };

  const accept = async (ride: OnDemandRide) => {
    setError(null);
    setBusyId(ride.id);
    try {
      await rideAction(ride.id, "accept");
      router.replace("/(app)/ondemand/ride");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't accept this ride.");
      setRequests(await listNearbyRequests().catch(() => []));
    } finally {
      setBusyId(null);
    }
  };

  if (!profile && !error) {
    return <View style={styles.container}>
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={handleBack} accessibilityLabel="Go back"><MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} /></Pressable>
        <Text style={styles.topNavTitle}>Driver Mode</Text><View style={{ width: 36 }} />
      </View>
      <LoadingSkeleton variant="list" />
    </View>;
  }

  if (profile && !profile.is_approved) {
    return (
      <View style={styles.container}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
          </Pressable>
          <Text style={styles.topNavTitle}>Driver Mode</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.centerCardContainer}>
          <View style={styles.pendingCard}>
            <View style={styles.warningCircle}>
              <MaterialCommunityIcons name="clock-outline" size={32} color={appColors.amber700} />
            </View>
            <Text style={styles.pendingTitle}>Vehicle Approval Required</Text>
            <Text style={styles.pendingSubtitle}>
              Your driver application has been submitted, but an admin needs to approve your vehicle before you can go online.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.push("/(app)/ondemand/settings" as any)}
            >
              <Text style={styles.primaryBtnText}>View Application Status</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>Driver Mode</Text>
        <View style={[styles.onlinePill, isOnline ? styles.onlinePillActive : styles.onlinePillInactive]}>
          <View style={[styles.statusDot, isOnline ? styles.statusDotActive : styles.statusDotInactive]} />
          <Text style={[styles.onlinePillText, isOnline ? styles.onlinePillTextActive : styles.onlinePillTextInactive]}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
      >
        {/* Driver Online Toggle Card */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={[styles.iconCircle, isOnline ? styles.iconCircleActive : styles.iconCircleInactive]}>
              <MaterialCommunityIcons
                name="steering"
                size={24}
                color={isOnline ? appColors.primary : appColors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>{isOnline ? "You are Online" : "You are Offline"}</Text>
              <Text style={styles.toggleSubtitle}>
                {isOnline
                  ? "Broadcasting live location. Requests within 5 km appear below."
                  : "Go online to start seeing ride requests near you."}
              </Text>
            </View>
            {isToggling ? (
              <ActivityIndicator color={appColors.primary} size="small" />
            ) : (
              <Switch
                value={isOnline}
                onValueChange={toggleOnline}
                trackColor={{ true: appColors.primary, false: appColors.border }}
                thumbColor={appColors.white}
              />
            )}
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={appColors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Nearby Requests Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Nearby Ride Requests</Text>
          {isOnline && requests.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{requests.length} available</Text>
            </View>
          )}
        </View>

        {!isOnline && (
          <View style={styles.emptyStateCard}>
            <MaterialCommunityIcons name="car-off" size={36} color={appColors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyStateTitle}>You're Currently Offline</Text>
            <Text style={styles.emptyStateSubtitle}>
              Toggle the switch above to go online and receive ride requests from nearby students.
            </Text>
          </View>
        )}

        {isOnline && requests.length === 0 && !error && (
          <View style={styles.emptyStateCard}>
            <ActivityIndicator size="small" color={appColors.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyStateTitle}>Searching for Requests...</Text>
            <Text style={styles.emptyStateSubtitle}>
              Requests within 5 km will show here automatically. Refreshes every 5 seconds.
            </Text>
          </View>
        )}

        {requests.map((ride) => (
          <View key={ride.id} style={styles.requestCard}>
            {/* Route Points */}
            <View style={styles.routeContainer}>
              <View style={styles.routePointRow}>
                <View style={styles.pickupDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pointLabel}>PICKUP</Text>
                  <Text style={styles.pointName} numberOfLines={1}>{ride.pickup_label}</Text>
                </View>
              </View>

              <View style={styles.routeTimelineLine} />

              <View style={styles.routePointRow}>
                <View style={styles.dropoffDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pointLabel}>DESTINATION</Text>
                  <Text style={styles.pointName} numberOfLines={1}>{ride.drop_label}</Text>
                </View>
              </View>
            </View>

            {/* Metrics and Rider info */}
            <View style={styles.metricsRow}>
              <View style={styles.metricChip}>
                <MaterialCommunityIcons name="navigation-variant-outline" size={14} color={appColors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={styles.metricChipText}>{ride.pickup_distance_km} km away</Text>
              </View>
              <View style={styles.metricChip}>
                <MaterialCommunityIcons name="map-marker-distance" size={14} color={appColors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={styles.metricChipText}>{ride.distance_km} km trip</Text>
              </View>
              <View style={styles.fareChip}>
                <MaterialCommunityIcons name="gas-station" size={14} color={appColors.primary} style={{ marginRight: 3 }} />
                <Text style={styles.fareChipText}>Rs {ride.fare}</Text>
              </View>
            </View>

            <View style={styles.riderRow}>
              <MaterialCommunityIcons name="account-circle-outline" size={16} color={appColors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.riderName}>Rider: {ride.rider.full_name}</Text>
            </View>

            {/* Accept Button */}
            <Pressable
              style={[styles.primaryBtn, busyId === ride.id && styles.btnDisabled]}
              onPress={() => accept(ride)}
              disabled={busyId !== null}
            >
              {busyId === ride.id ? (
                <ActivityIndicator color={appColors.primary} />
              ) : (
                <View style={styles.btnContentRow}>
                  <MaterialCommunityIcons name="check-bold" size={18} color={appColors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Accept Ride</Text>
                </View>
              )}
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  topNavBar: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10 + headerGrow,
    backgroundColor: appColors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: appColors.headerBg,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appColors.headerControlBg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.headerControlBorder,
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: appColors.onHeader,
  },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  onlinePillActive: {
    backgroundColor: appColors.surfaceMuted,
  },
  onlinePillInactive: {
    backgroundColor: appColors.border,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusDotActive: {
    backgroundColor: appColors.surfaceMuted,
  },
  statusDotInactive: {
    backgroundColor: appColors.textMuted,
  },
  onlinePillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  onlinePillTextActive: {
    color: appColors.primary,
  },
  onlinePillTextInactive: {
    color: appColors.textSecondary,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 14,
  },
  centerCardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pendingCard: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 24,
    alignItems: "center",
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.035,
    shadowRadius: 3,
    elevation: 1,
    maxWidth: 340,
  },
  warningCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: appColors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  pendingSubtitle: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  card: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 16,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,

    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleActive: {

  },
  iconCircleInactive: {

  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: appColors.textSecondary,
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.dangerBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.red300,
  },
  errorText: {
    flex: 1,
    color: appColors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: appColors.text,
  },
  countBadge: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: appColors.primary,
  },
  emptyStateCard: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 24,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 16,
    maxWidth: 260,
  },
  requestCard: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 16,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  routeContainer: {
    backgroundColor: appColors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  routePointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickupDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: appColors.surfaceMuted,
  },
  dropoffDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: appColors.danger,
  },
  routeTimelineLine: {
    width: 2,
    height: 14,
    backgroundColor: appColors.border,
    marginLeft: 3.5,
    marginVertical: 2,
  },
  pointLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: appColors.textMuted,
    letterSpacing: 0.5,
  },
  pointName: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metricChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  fareChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fareChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: appColors.primary,
  },
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  riderName: {
    fontSize: 12,
    color: appColors.textSecondary,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: appColors.gold,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 3,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: appColors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
