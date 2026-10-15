import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { Button, Card, ScreenContainer, colors, font, spacing, typography } from "../../../core/ui";
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
  const [profile, setProfile] = useState<RideProfile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState<OnDemandRide[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    getMyRideProfile()
      .then((loaded) => {
        setProfile(loaded);
        setIsOnline(!!loaded?.is_online);
      })
      .catch(() => setError("Couldn't load your driver profile."));
  }, []);

  // Every 5 seconds while online: share my position, jump to my ride if I have one, else refresh the request list.
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
    if (wantOnline) {
      // Send one location first, so the driver is never "online" without a GPS fix.
      const heartbeatError = await sendHeartbeat();
      if (heartbeatError) setError(heartbeatError);
      else setIsOnline(true);
      return;
    }
    try {
      await setDriverStatus(false);
      setIsOnline(false);
      setRequests([]);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't go offline.");
    }
  };

  const accept = async (ride: OnDemandRide) => {
    setError(null);
    setBusyId(ride.id);
    try {
      await rideAction(ride.id, "accept");
      router.replace("/(app)/ondemand/ride");
    } catch (err: any) {
      // Most likely another driver was faster - the message says so.
      setError(err?.response?.data?.detail ?? "Couldn't accept this ride.");
      setRequests(await listNearbyRequests().catch(() => []));
    } finally {
      setBusyId(null);
    }
  };

  if (profile && !profile.is_approved) {
    return (
      <ScreenContainer back="/(app)/rides">
        <Text style={styles.pageTitle}>Driver mode</Text>
        <Text style={styles.body}>An admin needs to approve your vehicle before you can go online.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll back="/(app)/rides">
      <Text style={styles.pageTitle}>Driver mode</Text>

      <Card contentStyle={styles.switchRow}>
        <View style={styles.flex1}>
          <Text style={styles.heading}>{isOnline ? "You are online" : "You are offline"}</Text>
          <Text style={styles.body}>
            {isOnline ? "Keep this app open. Requests within 5 km show up below." : "Go online to see ride requests near you."}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={toggleOnline}
          trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
          thumbColor={colors.surface}
        />
      </Card>

      {error && <Text style={styles.error}>{error}</Text>}

      {isOnline && requests.length === 0 && !error && <Text style={styles.body}>No requests nearby right now. This list refreshes every 5 seconds.</Text>}

      {requests.map((ride) => (
        <Card key={ride.id} contentStyle={styles.requestCard}>
          <Text style={styles.heading}>{ride.pickup_label} to {ride.drop_label}</Text>
          <Text style={styles.body}>
            {ride.pickup_distance_km} km to pickup · {ride.distance_km} km trip · Fuel share Rs {ride.fare}
          </Text>
          <Text style={styles.body}>Rider: {ride.rider.full_name}</Text>
          <Button label="Accept ride" onPress={() => accept(ride)} loading={busyId === ride.id} disabled={busyId !== null} />
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  pageTitle: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  requestCard: { gap: spacing.sm },
  heading: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  body: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
});
