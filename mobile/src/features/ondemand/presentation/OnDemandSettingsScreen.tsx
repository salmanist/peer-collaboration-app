import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Badge, Button, Card, ScreenContainer, Skeleton, TextField, colors, font, spacing, typography } from "../../../core/ui";
import { applyToDrive, getMyRideProfile, stopDriving, type RideProfile } from "../data/ondemandApi";

// Where a rider applies to become a driver, and where a driver (or a pending applicant) steps back.
export default function OnDemandSettingsScreen() {
  const [profile, setProfile] = useState<RideProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColour, setVehicleColour] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleSeats, setVehicleSeats] = useState("");
  const [isConfirmingStop, setIsConfirmingStop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMyRideProfile()
        .then(setProfile)
        .catch(() => setError("Couldn't load your settings. Check your connection."))
        .finally(() => setIsLoading(false));
    }, []),
  );

  const readError = (err: any, fallback: string) => {
    const detail = err?.response?.data;
    return typeof detail === "object" ? Object.values(detail).flat().join(" ") : fallback;
  };

  const submitApplication = async () => {
    setError(null);
    const seats = Number(vehicleSeats);
    if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
      setError("Seats must be a whole number from 1 to 8.");
      return;
    }
    setIsBusy(true);
    try {
      setProfile(
        await applyToDrive({
          vehicle_make: vehicleMake.trim(),
          vehicle_model: vehicleModel.trim(),
          vehicle_colour: vehicleColour.trim(),
          plate_number: plateNumber.trim(),
          vehicle_seats: seats,
        }),
      );
    } catch (err: any) {
      setError(readError(err, "Couldn't send your application. Please try again."));
    } finally {
      setIsBusy(false);
    }
  };

  const stop = async () => {
    setError(null);
    setIsBusy(true);
    try {
      setProfile(await stopDriving());
      setIsConfirmingStop(false);
    } catch (err: any) {
      setError(readError(err, "Couldn't do that. Please try again."));
      setIsConfirmingStop(false);
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <ScreenContainer scroll back="/(app)/rides">
        <Text style={styles.pageTitle}>On-demand settings</Text>
        {isLoading ? <Skeleton style={styles.skeleton} /> : <Text style={styles.error}>{error}</Text>}
      </ScreenContainer>
    );
  }

  const isDriver = profile.role === "driver";
  const vehicleSummary = `${profile.vehicle_colour} ${profile.vehicle_make} ${profile.vehicle_model} · ${profile.plate_number} · ${profile.vehicle_seats} seats`;

  return (
    <ScreenContainer scroll back="/(app)/rides">
      <Text style={styles.pageTitle}>On-demand settings</Text>

      {!isDriver && (
        <Card contentStyle={styles.card}>
          <Text style={styles.heading}>Become a driver</Text>
          <Text style={styles.body}>Send your vehicle details to the admin. Once approved, you can go online and accept ride requests.</Text>
          <TextField label="Make" placeholder="Honda" value={vehicleMake} onChangeText={setVehicleMake} />
          <TextField label="Model" placeholder="Civic" value={vehicleModel} onChangeText={setVehicleModel} />
          <TextField label="Colour" placeholder="White" value={vehicleColour} onChangeText={setVehicleColour} />
          <TextField label="Plate number" placeholder="LEA-1234" value={plateNumber} onChangeText={setPlateNumber} autoCapitalize="characters" />
          <TextField label="Seats for riders" placeholder="1–8" value={vehicleSeats} onChangeText={setVehicleSeats} keyboardType="number-pad" />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label="Submit application" onPress={submitApplication} loading={isBusy} />
        </Card>
      )}

      {isDriver && (
        <Card contentStyle={styles.card}>
          <View style={styles.row}>
            <Text style={styles.heading}>{profile.is_approved ? "You are a driver" : "Application sent"}</Text>
            <Badge label={profile.is_approved ? "Approved" : "Waiting for approval"} tone={profile.is_approved ? "success" : "warning"} />
          </View>
          <Text style={styles.body}>{vehicleSummary}</Text>
          {!profile.is_approved && <Text style={styles.body}>An admin will review your vehicle. Until then you can still request rides as a rider.</Text>}
          {error && <Text style={styles.error}>{error}</Text>}

          {!isConfirmingStop ? (
            <Button
              label={profile.is_approved ? "Stop being a driver" : "Withdraw application"}
              variant="danger"
              onPress={() => setIsConfirmingStop(true)}
              disabled={isBusy}
            />
          ) : (
            <View style={styles.confirmBox}>
              <Text style={styles.body}>
                {profile.is_approved
                  ? "You will become a rider again and your vehicle details will be removed. To drive again you must re-apply."
                  : "Your application and vehicle details will be removed."}
              </Text>
              <Button label="Yes, continue" variant="danger" onPress={stop} loading={isBusy} />
              <Button label="Keep it" variant="ghost" onPress={() => setIsConfirmingStop(false)} disabled={isBusy} />
            </View>
          )}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink },
  card: { gap: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  confirmBox: { gap: spacing.md },
  heading: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  body: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  skeleton: { height: 120, borderRadius: 16 },
});
