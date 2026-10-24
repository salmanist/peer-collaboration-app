import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
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

import { useSessionStore } from "../../../core/auth/session";
import {
  acceptRequest,
  cancelRide,
  completeRide,
  declineRequest,
  formatTime12h,
  getRide,
  joinRide,
  listRideRequests,
  startRide,
  type Ride,
  type RideJoinRequest,
} from "../data/ridesApi";

const statusTone: Record<string, { bg: string; text: string }> = {
  pending: { bg: appColors.amber50, text: appColors.amber700 },
  accepted: { bg: appColors.surfaceMuted, text: appColors.primary },
  declined: { bg: appColors.red50, text: appColors.danger },
};

const rideStatusBadge: Partial<Record<Ride["status"], { label: string; bg: string; text: string }>> = {
  in_progress: { label: "In Progress", bg: appColors.surfaceMuted, text: appColors.primary },
  completed: { label: "Completed", bg: appColors.surfaceMuted, text: appColors.primary },
  cancelled: { label: "Cancelled", bg: appColors.red50, text: appColors.danger },
  expired: { label: "Expired", bg: appColors.border, text: appColors.textSecondary },
};

export default function RideDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = Number(id);
  const user = useSessionStore((state) => state.user);

  const [ride, setRide] = useState<Ride | null>(null);
  const [requests, setRequests] = useState<RideJoinRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const rideData = await getRide(rideId);
      setRide(rideData);
      if (rideData.offerer.id === user?.id) {
        const requestsData = await listRideRequests(rideId);
        setRequests(requestsData.results);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't load this ride.");
    } finally {
      setIsLoading(false);
    }
  }, [rideId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const runAction = async (action: () => Promise<unknown>) => {
    setError(null);
    setIsActing(true);
    try {
      await action();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Action failed. Please try again.");
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading || !ride) {
    return (
      <View style={styles.rootContainer}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/rides")}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
          </Pressable>
          <Text style={styles.topNavTitle}>Trip Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <LoadingSkeleton variant="ride" />
        </View>
      </View>
    );
  }

  const isOfferer = ride.offerer.id === user?.id;
  const statusInfo = rideStatusBadge[ride.status];

  return (
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/rides")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>Trip Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        {/* Main Trip Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            {statusInfo ? (
              <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                <Text style={[styles.badgeText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
              </View>
            ) : null}
            {ride.same_gender_only && (
              <View style={[styles.badge, { backgroundColor: appColors.violet50 }]}>
                <MaterialCommunityIcons name="account-group" size={12} color={appColors.icon} style={{ marginRight: 3 }} />
                <Text style={[styles.badgeText, { color: appColors.icon }]}>Same Gender</Text>
              </View>
            )}
          </View>

          {/* Route Section */}
          <View style={styles.routeSection}>
            <View style={styles.routePoint}>
              <View style={styles.dotStart} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pointLabel}>Departure</Text>
                <Text style={styles.pointValue}>{ride.departure}</Text>
              </View>
            </View>

            <View style={styles.routeConnector} />

            <View style={styles.routePoint}>
              <View style={styles.dotEnd} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pointLabel}>Destination</Text>
                <Text style={styles.pointValue}>{ride.destination}</Text>
              </View>
            </View>
          </View>

          {/* Trip Details Chips */}
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <MaterialCommunityIcons name="calendar-clock" size={14} color={appColors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.chipText}>
                {ride.departure_date} · {formatTime12h(ride.departure_time)}
              </Text>
            </View>
            <View style={[styles.chip, styles.seatsChip]}>
              <MaterialCommunityIcons name="seat-passenger" size={14} color={appColors.amber700} style={{ marginRight: 4 }} />
              <Text style={[styles.chipText, styles.seatsText]}>
                {ride.seats_available}/{ride.seats_total} seats available
              </Text>
            </View>
          </View>

          {/* Offerer / Driver Info */}
          <View style={styles.driverSection}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="account" size={20} color={appColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{ride.offerer.full_name}</Text>
              <Text style={styles.driverSub}>{ride.offerer.email}</Text>
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Offerer Actions & Join Requests */}
        {isOfferer ? (
          <>
            {ride.status === "open" && (
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.primaryBtn, { flex: 1 }]}
                  onPress={() => runAction(() => startRide(rideId))}
                  disabled={isActing}
                >
                  <MaterialCommunityIcons name="play-circle-outline" size={18} color={appColors.white} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Start Ride</Text>
                </Pressable>

                <Pressable
                  style={[styles.dangerBtn, { flex: 1 }]}
                  onPress={() => runAction(() => cancelRide(rideId))}
                  disabled={isActing}
                >
                  <MaterialCommunityIcons name="cancel" size={18} color={appColors.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.dangerBtnText}>Cancel Trip</Text>
                </Pressable>
              </View>
            )}

            {ride.status === "in_progress" && (
              <Pressable
                style={styles.primaryBtn}
                onPress={() => runAction(() => completeRide(rideId))}
                disabled={isActing}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={18} color={appColors.white} style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Mark Ride Completed</Text>
              </Pressable>
            )}

            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="account-multiple-outline" size={18} color={appColors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeaderTitle}>Student Join Requests ({requests.length})</Text>
            </View>

            {requests.length === 0 ? (
              <View style={styles.emptyRequestsCard}>
                <MaterialCommunityIcons name="inbox-outline" size={32} color={appColors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyRequestsTitle}>No Requests Yet</Text>
                <Text style={styles.emptyRequestsSub}>Requests to carpool with you will appear here.</Text>
              </View>
            ) : (
              requests.map((request) => {
                const reqTone = statusTone[request.status] || statusTone.pending;
                return (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.requesterName}>{request.requester.full_name}</Text>
                        <Text style={styles.requesterSub}>{request.requester.email}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: reqTone.bg }]}>
                        <Text style={[styles.badgeText, { color: reqTone.text }]}>{request.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    {request.status === "pending" && ride.status === "open" && (
                      <View style={styles.requestActionsRow}>
                        <Pressable
                          style={styles.acceptBtn}
                          onPress={() => runAction(() => acceptRequest(request.id))}
                          disabled={isActing}
                        >
                          <MaterialCommunityIcons name="check" size={16} color={appColors.white} style={{ marginRight: 4 }} />
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        </Pressable>
                        <Pressable
                          style={styles.declineBtn}
                          onPress={() => runAction(() => declineRequest(request.id))}
                          disabled={isActing}
                        >
                          <MaterialCommunityIcons name="close" size={16} color={appColors.danger} style={{ marginRight: 4 }} />
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        ) : (
          /* Rider View */
          <View style={{ marginTop: 8 }}>
            {ride.my_request_status === null && ride.status === "open" && (
              <Pressable
                style={[styles.primaryBtn, isActing && styles.btnDisabled]}
                onPress={() => runAction(() => joinRide(rideId))}
                disabled={isActing}
              >
                {isActing ? (
                  <ActivityIndicator color={appColors.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="car-seat" size={20} color={appColors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Request to Join Carpool</Text>
                  </>
                )}
              </Pressable>
            )}

            {ride.my_request_status && (
              <View style={styles.statusBox}>
                <Text style={styles.statusBoxLabel}>Your Carpool Request</Text>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        (statusTone[ride.my_request_status] || statusTone.pending).bg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          (statusTone[ride.my_request_status] || statusTone.pending).text,
                      },
                    ]}
                  >
                    {ride.my_request_status.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  scrollContent: {
    padding: 16,
    gap: 14,
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
    gap: 14,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  routeSection: {
    gap: 8,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  routeConnector: {
    width: 2,
    height: 18,
    backgroundColor: appColors.border,
    marginLeft: 4,
  },
  dotStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: appColors.emerald500,
    marginTop: 4,
  },
  dotEnd: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: appColors.red500,
    marginTop: 4,
  },
  pointLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: appColors.textSecondary,
    textTransform: "uppercase",
  },
  pointValue: {
    fontSize: 15,
    fontWeight: "700",
    color: appColors.text,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  driverSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingTop: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: appColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
  },
  driverSub: {
    fontSize: 12,
    color: appColors.textSecondary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: appColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: appColors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  dangerBtn: {
    backgroundColor: appColors.red50,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtnText: {
    color: appColors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
  },
  emptyRequestsCard: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.border,
  },
  emptyRequestsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
  },
  emptyRequestsSub: {
    fontSize: 12,
    color: appColors.textSecondary,
    marginTop: 2,
  },
  requestCard: {
    backgroundColor: appColors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 10,
  },
  requestTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requesterName: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
  },
  requesterSub: {
    fontSize: 11,
    color: appColors.textSecondary,
  },
  requestActionsRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingTop: 8,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appColors.primary,
    borderRadius: 8,
    paddingVertical: 8,
  },
  acceptBtnText: {
    color: appColors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appColors.red50,
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
  },
  declineBtnText: {
    color: appColors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  statusBox: {
    backgroundColor: appColors.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: appColors.border,
  },
  statusBoxLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.red50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: appColors.danger,
    fontWeight: "600",
  },
});
