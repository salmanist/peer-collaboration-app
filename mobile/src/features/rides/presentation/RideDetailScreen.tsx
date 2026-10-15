import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import { Badge, Button, Card, EmptyState, ScreenContainer, colors, font, spacing, typography } from "../../../core/ui";
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

const statusTone: Record<string, "warning" | "success" | "danger"> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
};

const rideStatusBadge: Partial<Record<Ride["status"], { label: string; tone: "primary" | "success" | "danger" | "neutral" }>> = {
  in_progress: { label: "In progress", tone: "primary" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
};

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = Number(id);
  const user = useSessionStore((state) => state.user);

  const [ride, setRide] = useState<Ride | null>(null);
  const [requests, setRequests] = useState<RideJoinRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const runAction = async (action: () => Promise<unknown>) => {
    setError(null);
    setIsActing(true);
    try {
      await action();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "That didn't work.");
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading || !ride) {
    return (
      <ScreenContainer center back="/(app)/rides">
        <ActivityIndicator color={colors.ink} />
      </ScreenContainer>
    );
  }

  const isOfferer = ride.offerer.id === user?.id;

  return (
    <ScreenContainer scroll back="/(app)/rides">
      <Card style={styles.summaryCard} backgroundColor={colors.primaryFixed}>
        <View style={styles.summaryRow}>
          <Text style={styles.route}>{ride.departure} → {ride.destination}</Text>
          {ride.same_gender_only && <Badge label="Same gender" tone="tertiary" />}
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.ink} />
          <Text style={styles.meta}>{ride.departure_date} at {formatTime12h(ride.departure_time)}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="seat-outline" size={16} color={colors.ink} />
          <Text style={styles.meta}>{ride.seats_available}/{ride.seats_total} seats · offered by {ride.offerer.full_name}</Text>
        </View>
        <Text style={styles.metaMuted}>{ride.offerer.email}</Text>
        {rideStatusBadge[ride.status] && (
          <Badge label={rideStatusBadge[ride.status]!.label} tone={rideStatusBadge[ride.status]!.tone} />
        )}
      </Card>

      {error && <Text style={styles.error}>{error}</Text>}

      {isOfferer ? (
        <>
          {ride.status === "open" && (
            <View style={styles.row}>
              <Button label="Start ride" onPress={() => runAction(() => startRide(rideId))} disabled={isActing} style={styles.flex1} />
              <Button label="Cancel ride" variant="danger" onPress={() => runAction(() => cancelRide(rideId))} disabled={isActing} style={styles.flex1} />
            </View>
          )}
          {ride.status === "in_progress" && (
            <Button label="Complete ride" onPress={() => runAction(() => completeRide(rideId))} disabled={isActing} />
          )}

          <Text style={styles.sectionTitle}>Join requests</Text>
          {requests.length === 0 ? (
            <EmptyState icon="inbox-outline" title="No requests yet" subtitle="You'll see them here as students ask to join." />
          ) : (
            requests.map((request) => (
              <Card key={request.id} style={styles.requestCard} flat backgroundColor={colors.surfaceMuted}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestTextGroup}>
                    <Text style={styles.requestName}>{request.requester.full_name}</Text>
                    <Text style={styles.metaMuted}>{request.requester.email}</Text>
                  </View>
                  <Badge label={request.status} tone={statusTone[request.status]} />
                </View>
                {request.status === "pending" && ride.status === "open" && (
                  <View style={styles.row}>
                    <Button label="Accept" onPress={() => runAction(() => acceptRequest(request.id))} disabled={isActing} style={styles.flex1} />
                    <Button label="Decline" variant="danger" onPress={() => runAction(() => declineRequest(request.id))} disabled={isActing} style={styles.flex1} />
                  </View>
                )}
              </Card>
            ))
          )}
        </>
      ) : (
        <>
          {ride.my_request_status === null && ride.status === "open" && (
            <Button label="Request to join" onPress={() => runAction(() => joinRide(rideId))} loading={isActing} />
          )}
          {ride.my_request_status && (
            <Card flat backgroundColor={colors.surfaceMuted} contentStyle={styles.statusCard}>
              <Text style={styles.metaMuted}>Your request</Text>
              <Badge label={ride.my_request_status} tone={statusTone[ride.my_request_status]} />
            </Card>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: { gap: spacing.xs },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  route: { fontSize: typography.size.lg, fontFamily: font.serif, color: colors.ink, flexShrink: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  meta: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.ink },
  metaMuted: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  sectionTitle: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink, marginTop: spacing.sm },
  requestCard: { gap: spacing.sm },
  requestHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  requestTextGroup: { gap: 2 },
  requestName: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  row: { flexDirection: "row", gap: spacing.sm },
  flex1: { flex: 1 },
  statusCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
