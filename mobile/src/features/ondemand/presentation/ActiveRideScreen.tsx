import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import { Badge, Button, Card, ScreenContainer, colors, font, spacing, typography } from "../../../core/ui";
import { sendHeartbeat } from "../data/driverLocation";
import { getCurrentRide, getRide, rideAction, type OnDemandRide, type RideStatus } from "../data/ondemandApi";
import { RideMap } from "./RideMap";
import { usePolling } from "./usePolling";

const STATUS_BADGE: Record<RideStatus, { label: string; tone: "primary" | "warning" | "success" | "neutral" | "danger" }> = {
  requested: { label: "Looking for a driver", tone: "warning" },
  accepted: { label: "Driver on the way", tone: "primary" },
  arrived: { label: "Driver arrived", tone: "primary" },
  in_progress: { label: "On the way", tone: "primary" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
  no_driver: { label: "No driver found", tone: "danger" },
};

const ACTIVE: RideStatus[] = ["requested", "accepted", "arrived", "in_progress"];

function describe(ride: OnDemandRide, isDriver: boolean): string {
  switch (ride.status) {
    case "requested":
      return "Nearby drivers can see your request. The first one to accept gets the ride.";
    case "accepted":
      return isDriver ? `Head to the pickup point: ${ride.pickup_label}.` : "Your driver is on the way to the pickup point.";
    case "arrived":
      return isDriver ? "Wait for the rider, then start the ride." : "Your driver has arrived. Meet them at the pickup point.";
    case "in_progress":
      return `On the way to ${ride.drop_label}.`;
    case "completed":
      return `Ride finished. Fuel share: Rs ${ride.fare}, paid to the driver directly (outside the app).`;
    case "cancelled":
      return `This ride was cancelled by the ${ride.cancelled_by || "other side"}.`;
    case "no_driver":
      return "No driver accepted in time. Try again to search for drivers once more, or cancel the ride.";
  }
}

export default function ActiveRideScreen() {
  const userId = useSessionStore((state) => state.user?.id);
  const [ride, setRide] = useState<OnDemandRide | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  // Once the ride stops being "current" (finished/cancelled) we keep asking for it by id to show how it ended.
  const lastRideId = useRef<number | null>(null);
  const isDriver = !!ride && ride.driver?.id === userId;

  usePolling(async () => {
    try {
      let latest = await getCurrentRide();
      if (!latest && lastRideId.current) latest = await getRide(lastRideId.current);
      if (latest) lastRideId.current = latest.id;
      setRide(latest);
      // A driver keeps sharing their position during the ride so the rider can follow them later.
      if (latest && latest.driver?.id === userId && ACTIVE.includes(latest.status)) sendHeartbeat();
    } catch {
      setError("Couldn't refresh. Check your connection.");
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

  // Cancelling a ride nobody accepted: close it on the server, then leave the screen.
  const cancelAndLeave = async () => {
    if (!ride) return;
    setError(null);
    setIsBusy(true);
    try {
      await rideAction(ride.id, "cancel");
      router.replace("/(app)/rides");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "That didn't work. Please try again.");
      setIsBusy(false);
    }
  };

  const goHome = () => router.replace("/(app)/rides");

  if (!isLoaded) {
    return (
      <ScreenContainer back="/(app)/rides" center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!ride) {
    return (
      <ScreenContainer back="/(app)/rides" center>
        <Text style={styles.body}>You have no ride right now.</Text>
        <Button label="Back" onPress={goHome} />
      </ScreenContainer>
    );
  }

  const badge = STATUS_BADGE[ride.status];
  const isActive = ACTIVE.includes(ride.status);
  const canRiderCancel = !isDriver && ["requested", "accepted", "arrived"].includes(ride.status);
  const isNoDriver = ride.status === "no_driver";
  const canDriverCancel = isDriver && ["accepted", "arrived"].includes(ride.status);

  return (
    <ScreenContainer scroll back="/(app)/rides">
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Your ride</Text>
        <Badge label={badge.label} tone={badge.tone} />
      </View>

      <RideMap
        pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
        drop={{ lat: ride.drop_lat, lng: ride.drop_lng }}
        route={ride.route}
        height={260}
      />

      <Card contentStyle={styles.card}>
        <Text style={styles.heading}>{ride.pickup_label} to {ride.drop_label}</Text>
        <Text style={styles.body}>{describe(ride, isDriver)}</Text>
        {ride.status === "requested" && <ActivityIndicator color={colors.primary} />}
        <Text style={styles.detail}>{ride.distance_km} km · Fuel share Rs {ride.fare}</Text>
      </Card>

      {ride.driver && !isDriver && (
        <Card contentStyle={styles.card}>
          <Text style={styles.label}>Your driver</Text>
          <Text style={styles.heading}>{ride.driver.full_name}</Text>
          <Text style={styles.body}>{ride.driver.vehicle} · {ride.driver.plate_number}</Text>
        </Card>
      )}
      {isDriver && (
        <Card contentStyle={styles.card}>
          <Text style={styles.label}>Your rider</Text>
          <Text style={styles.heading}>{ride.rider.full_name}</Text>
        </Card>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {isDriver && ride.status === "accepted" && <Button label="I've arrived" onPress={() => act("arrived")} loading={isBusy} />}
      {isDriver && ride.status === "arrived" && <Button label="Start ride" onPress={() => act("start")} loading={isBusy} />}
      {isDriver && ride.status === "in_progress" && <Button label="Complete ride" onPress={() => act("complete")} loading={isBusy} />}
      {(canRiderCancel || canDriverCancel) && <Button label="Cancel ride" variant="danger" onPress={() => act("cancel")} disabled={isBusy} />}
      {isNoDriver && !isDriver && (
        <>
          <Button label="Try again" onPress={() => act("retry")} loading={isBusy} />
          <Button label="Cancel ride" variant="danger" onPress={cancelAndLeave} disabled={isBusy} />
        </>
      )}
      {!isActive && !isNoDriver && <Button label="Done" onPress={goHome} />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  pageTitle: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink },
  card: { gap: spacing.sm },
  heading: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  label: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textMuted },
  body: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
  detail: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.ink },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
});
