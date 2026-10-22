import { colors as appColors } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { Text } from "../../../core/ui/AppText";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
import { sendHeartbeat } from "../data/driverLocation";
import { getCurrentRide, getRide, rideAction, type OnDemandRide, type RideStatus } from "../data/ondemandApi";
import { RideMap } from "./RideMap";
import { usePolling } from "./usePolling";

const ACTIVE: RideStatus[] = ["requested", "accepted", "arrived", "in_progress"];

interface StatusConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
}

const STATUS_CONFIGS: Record<RideStatus, StatusConfig> = {
  requested: {
    label: "Requested",
    badgeBg: appColors.surfaceMuted,
    badgeText: "#B45309",
    icon: "magnify",
    title: "Ride requested",
  },
  accepted: {
    label: "Driver En Route",
    badgeBg: appColors.surfaceMuted,
    badgeText: appColors.primary,
    icon: "car-clock",
    title: "Driver is on the way",
  },
  arrived: {
    label: "Driver Arrived",
    badgeBg: appColors.surfaceMuted,
    badgeText: "#0369A1",
    icon: "map-marker-check",
    title: "Driver has arrived at pickup",
  },
  in_progress: {
    label: "Trip in Progress",
    badgeBg: appColors.surfaceMuted,
    badgeText: appColors.primary,
    icon: "navigation",
    title: "On the way to destination",
  },
  completed: {
    label: "Completed",
    badgeBg: appColors.surfaceMuted,
    badgeText: appColors.primary,
    icon: "check-circle",
    title: "Ride Completed",
  },
  cancelled: {
    label: "Cancelled",
    badgeBg: "#FEF2F2",
    badgeText: "#DC2626",
    icon: "close-circle",
    title: "Ride Cancelled",
  },
  no_driver: {
    label: "No Driver Found",
    badgeBg: "#FEF2F2",
    badgeText: "#DC2626",
    icon: "account-search",
    title: "No driver accepted in time",
  },
};

function describe(ride: OnDemandRide, isDriver: boolean): string {
  switch (ride.status) {
    case "requested":
      return "Nearby drivers can see your request. The first one to accept will pick you up.";
    case "accepted":
      return isDriver
        ? `Head to the pickup point: ${ride.pickup_label}.`
        : "Your driver is on the way to your pickup location.";
    case "arrived":
      return isDriver
        ? "Wait for the rider to enter, then start the ride."
        : "Your driver has arrived! Meet them at the pickup point.";
    case "in_progress":
      return `Heading directly towards ${ride.drop_label}.`;
    case "completed":
      return `Trip finished. Fuel share contribution: Rs ${ride.fare}, paid directly to the driver.`;
    case "cancelled":
      return `This ride was cancelled by the ${ride.cancelled_by || "other party"}.`;
    case "no_driver":
      return "No nearby driver accepted the request in time. You can search again or cancel.";
  }
}

export interface ActiveRideScreenProps {
  embedded?: boolean;
  initialRide?: OnDemandRide | null;
  onClose?: () => void;
}

export default function ActiveRideScreen({ embedded = false, initialRide, onClose }: ActiveRideScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const userId = useSessionStore((state) => state.user?.id);
  const [ride, setRide] = useState<OnDemandRide | null>(initialRide ?? null);
  const [isLoaded, setIsLoaded] = useState(!!initialRide);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const lastRideId = useRef<number | null>(null);
  const isDriver = !!ride && ride.driver?.id === userId;

  usePolling(async () => {
    try {
      let latest = await getCurrentRide();
      if (!latest && lastRideId.current) latest = await getRide(lastRideId.current);
      if (latest) lastRideId.current = latest.id;
      setRide(latest);
      if (latest && latest.driver?.id === userId && ACTIVE.includes(latest.status)) {
        sendHeartbeat();
      }
    } catch {
      setError("Couldn't refresh ride status. Check your connection.");
    } finally {
      setIsLoaded(true);
    }
  });

  const act = async (action: Parameters<typeof rideAction>[1]) => {
    if (!ride) return;
    setError(null);
    setIsBusy(true);
    try {
      setRide(await rideAction(ride.id, action));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "That didn't work. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const cancelAndLeave = async () => {
    if (!ride) return;
    setError(null);
    setIsBusy(true);
    try {
      await rideAction(ride.id, "cancel");
      router.replace({ pathname: "/(app)/rides", params: { tab: "ondemand" } });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't cancel ride.");
      setIsBusy(false);
    }
  };

  const goHome = () => router.replace({ pathname: "/(app)/rides", params: { tab: "ondemand" } });

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={goHome}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
          </Pressable>
          <Text style={styles.topNavTitle}>My Ride</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <LoadingSkeleton variant="ride" />

        </View>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.container}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={goHome}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
          </Pressable>
          <Text style={styles.topNavTitle}>My Ride</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="car-off" size={36} color={appColors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No Active Ride</Text>
          <Text style={styles.emptySubtitle}>You do not have any ongoing or pending rides right now.</Text>
          <Pressable style={styles.primaryBtn} onPress={goHome}>
            <Text style={styles.primaryBtnText}>Back to Rides Hub</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIGS[ride.status];
  const isActive = ACTIVE.includes(ride.status);
  const canRiderCancel = !isDriver && ["requested", "accepted", "arrived"].includes(ride.status);
  const isNoDriver = ride.status === "no_driver";
  const canDriverCancel = isDriver && ["accepted", "arrived"].includes(ride.status);

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar with Status Chip */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={goHome}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>My Ride</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
      >
        {ride.status !== "requested" && <View style={[styles.headerBadge, { backgroundColor: statusConfig.badgeBg }]}>
          <Text style={[styles.headerBadgeText, { color: statusConfig.badgeText }]}>
            {statusConfig.label}
          </Text>
        </View>}
        {/* Map Container */}
        <View style={styles.mapCard}>
          <RideMap
            pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
            drop={{ lat: ride.drop_lat, lng: ride.drop_lng }}
            route={ride.route}
            height={240}
          />
        </View>

        {/* Live Trip Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconCircle, { }]}>
              {ride.status === "requested" ? (
                <ActivityIndicator size="small" color={statusConfig.badgeText} />
              ) : (
                <MaterialCommunityIcons name={statusConfig.icon} size={22} color={statusConfig.badgeText} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>{statusConfig.title}</Text>
              <Text style={styles.statusDescription}>{describe(ride, isDriver)}</Text>
            </View>
          </View>

          {/* Route Visualizer */}
          <View style={styles.routeContainer}>
            <View style={styles.routePointRow}>
              <View style={styles.pickupDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routePointLabel}>PICKUP LOCATION</Text>
                <Text style={styles.routePointName} numberOfLines={1}>{ride.pickup_label}</Text>
              </View>
            </View>

            <View style={styles.routeTimelineLine} />

            <View style={styles.routePointRow}>
              <View style={styles.dropoffDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routePointLabel}>DROP-OFF DESTINATION</Text>
                <Text style={styles.routePointName} numberOfLines={1}>{ride.drop_label}</Text>
              </View>
            </View>
          </View>

          {/* Metric Chips Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricChip}>
              <MaterialCommunityIcons name="map-marker-distance" size={15} color={appColors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.metricChipText}>{ride.distance_km} km trip</Text>
            </View>
            <View style={styles.fareChip}>
              <MaterialCommunityIcons name="gas-station" size={15} color={appColors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.fareChipText}>Fuel Share: Rs {ride.fare}</Text>
            </View>
          </View>
          {(canRiderCancel || canDriverCancel) && (
            <Pressable
              style={[styles.dangerOutlineBtn, isBusy && styles.btnDisabled]}
              onPress={() => act("cancel")}
              disabled={isBusy}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.dangerOutlineBtnText}>Cancel Ride</Text>
            </Pressable>
          )}
        </View>

        {/* Driver Card (if user is rider) */}
        {ride.driver && !isDriver && (
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>YOUR DRIVER</Text>
            <View style={styles.profileRow}>
              <View style={styles.avatarCircle}>
                <MaterialCommunityIcons name="steering" size={24} color={appColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{ride.driver.full_name}</Text>
                <Text style={styles.profileDetail}>{ride.driver.vehicle}</Text>
              </View>
              <View style={styles.plateChip}>
                <Text style={styles.plateChipText}>{ride.driver.plate_number}</Text>
              </View>
            </View>
            <Text style={styles.paymentNote}>
              Pay the fuel contribution directly to your driver in cash upon completion.
            </Text>
          </View>
        )}

        {/* Rider Card (if user is driver) */}
        {isDriver && (
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>YOUR PASSENGER</Text>
            <View style={styles.profileRow}>
              <View style={styles.avatarCircle}>
                <MaterialCommunityIcons name="account" size={24} color={appColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{ride.rider.full_name}</Text>
                <Text style={styles.profileDetail}>Meet passenger at the pickup spot</Text>
              </View>
            </View>
          </View>
        )}

        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Action Controls */}
        <View style={styles.actionsContainer}>
          {isDriver && ride.status === "accepted" && (
            <Pressable
              style={[styles.primaryBtn, isBusy && styles.btnDisabled]}
              onPress={() => act("arrived")}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator color={appColors.primary} />
              ) : (
                <View style={styles.btnContentRow}>
                  <MaterialCommunityIcons name="map-marker-check" size={20} color={appColors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>I've Arrived at Pickup</Text>
                </View>
              )}
            </Pressable>
          )}

          {isDriver && ride.status === "arrived" && (
            <Pressable
              style={[styles.primaryBtn, isBusy && styles.btnDisabled]}
              onPress={() => act("start")}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator color={appColors.primary} />
              ) : (
                <View style={styles.btnContentRow}>
                  <MaterialCommunityIcons name="car-sports" size={20} color={appColors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Start Ride</Text>
                </View>
              )}
            </Pressable>
          )}

          {isDriver && ride.status === "in_progress" && (
            <Pressable
              style={[styles.primaryBtn, isBusy && styles.btnDisabled]}
              onPress={() => act("complete")}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator color={appColors.primary} />
              ) : (
                <View style={styles.btnContentRow}>
                  <MaterialCommunityIcons name="check-all" size={20} color={appColors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Complete Ride</Text>
                </View>
              )}
            </Pressable>
          )}



          {isNoDriver && !isDriver && (
            <View style={{ gap: 10 }}>
              <Pressable
                style={[styles.primaryBtn, isBusy && styles.btnDisabled]}
                onPress={() => act("retry")}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color={appColors.primary} />
                ) : (
                  <View style={styles.btnContentRow}>
                    <MaterialCommunityIcons name="refresh" size={20} color={appColors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.primaryBtnText}>Search for Drivers Again</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                style={[styles.dangerOutlineBtn, isBusy && styles.btnDisabled]}
                onPress={cancelAndLeave}
                disabled={isBusy}
              >
                <MaterialCommunityIcons name="close" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.dangerOutlineBtnText}>Cancel Request</Text>
              </Pressable>
            </View>
          )}

          {!isActive && !isNoDriver && (
            <Pressable style={styles.primaryBtn} onPress={goHome}>
              <View style={styles.btnContentRow}>
                <MaterialCommunityIcons name="check" size={20} color={appColors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Done</Text>
              </View>
            </Pressable>
          )}
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
  },
  topNavTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: appColors.primary,
  },
  headerBadge: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: appColors.textSecondary,
    fontWeight: "600",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,


    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  mapCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.035,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  statusIconCircle: {
    width: 42,
    height: 42,

    justifyContent: "center",
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 2,
  },
  statusDescription: {
    fontSize: 13,
    color: appColors.textSecondary,
    lineHeight: 18,
  },
  routeContainer: {
    backgroundColor: appColors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.border,
    marginBottom: 14,
  },
  routePointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: appColors.surfaceMuted,
  },
  dropoffDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
  },
  routeTimelineLine: {
    width: 2,
    height: 16,
    backgroundColor: appColors.border,
    marginLeft: 4,
    marginVertical: 3,
  },
  routePointLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: appColors.textMuted,
    letterSpacing: 0.5,
  },
  routePointName: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  fareChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fareChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: appColors.primary,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: appColors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: appColors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 15,
    fontWeight: "800",
    color: appColors.text,
  },
  profileDetail: {
    fontSize: 12,
    color: appColors.textSecondary,
    marginTop: 1,
  },
  plateChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: appColors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: appColors.text,
    letterSpacing: 0.5,
  },
  paymentNote: {
    fontSize: 11,
    color: appColors.textSecondary,
    marginTop: 10,
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  actionsContainer: {
    marginTop: 4,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
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
    fontSize: 15,
    fontWeight: "800",
  },
  dangerOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  dangerOutlineBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
