import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Switch, StyleSheet, Text, View } from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import { Badge, Button, Card, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import { createRide, type RideLocation } from "../data/ridesApi";
import { LocationAutocomplete } from "./LocationAutocomplete";

// Local YYYY-MM-DD, not toISOString() — that shifts to UTC and can land on
// the wrong day near midnight.
const dateStr = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const MERIDIEMS = ["AM", "PM"] as const;

export default function OfferRideScreen() {
  const user = useSessionStore((state) => state.user);

  // Computed on each mount, not at module load — a module-level constant
  // would freeze "Today" to whenever the JS bundle first evaluated this file.
  const datePresets = [
    { label: "Today", value: dateStr(0) },
    { label: "Tomorrow", value: dateStr(1) },
    { label: "In 2 days", value: dateStr(2) },
  ];

  const [departure, setDeparture] = useState<RideLocation | null>(null);
  const [destination, setDestination] = useState<RideLocation | null>(null);
  const [departureDate, setDepartureDate] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [meridiem, setMeridiem] = useState<(typeof MERIDIEMS)[number]>("AM");
  const [seatsTotal, setSeatsTotal] = useState("1");
  const [sameGenderOnly, setSameGenderOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!departure || !destination) {
      setError("Pick both a departure and destination from the suggestions.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate.trim())) {
      setError("Departure date must be in YYYY-MM-DD format.");
      return;
    }
    const h = Number(hour);
    const m = Number(minute);
    if (!hour || !minute || h < 1 || h > 12 || m < 0 || m > 59) {
      setError("Enter a valid departure time.");
      return;
    }
    const hour24 = meridiem === "PM" ? (h % 12) + 12 : h % 12;

    const [year, month, day] = departureDate.trim().split("-").map(Number);
    if (new Date(year, month - 1, day, hour24, m) < new Date()) {
      setError("Departure time can't be in the past.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ride = await createRide({
        departure: departure.name,
        destination: destination.name,
        departure_date: departureDate.trim(),
        departure_time: `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
        seats_total: Number(seatsTotal),
        same_gender_only: sameGenderOnly,
      });
      router.replace(`/(app)/rides/${ride.id}`);
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" ") : "Couldn't offer this ride.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll back="/(app)/rides">
      <Text style={styles.title}>Offer a ride</Text>
      <Text style={styles.subtitle}>Share your route and let other students request a seat</Text>

      <Card style={styles.card}>
        <View style={styles.row}>
          <LocationAutocomplete label="Departure" placeholder="DHA Phase 5" value={departure} onChange={setDeparture} containerStyle={styles.flex1} />
          <LocationAutocomplete label="Destination" placeholder="LGU Campus" value={destination} onChange={setDestination} containerStyle={styles.flex1} />
        </View>
        <TextField label="Date" placeholder="YYYY-MM-DD" value={departureDate} onChangeText={setDepartureDate} />
        <View style={styles.chipRow}>
          {datePresets.map((preset) => (
            <Pressable key={preset.label} onPress={() => setDepartureDate(preset.value)}>
              <Badge label={preset.label} tone={departureDate === preset.value ? "primary" : "neutral"} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Time</Text>
        <View style={styles.timeRow}>
          <TextField placeholder="07" value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} containerStyle={styles.timeInput} />
          <Text style={styles.colon}>:</Text>
          <TextField placeholder="30" value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} containerStyle={styles.timeInput} />
          <View style={styles.chipRow}>
            {MERIDIEMS.map((m) => (
              <Pressable key={m} onPress={() => setMeridiem(m)}>
                <Badge label={m} tone={meridiem === m ? "primary" : "neutral"} />
              </Pressable>
            ))}
          </View>
        </View>

        <TextField label="Seats available" placeholder="1–8" value={seatsTotal} onChangeText={setSeatsTotal} keyboardType="number-pad" />

        <View style={styles.switchRow}>
          <View style={styles.switchTextGroup}>
            <Text style={styles.switchLabel}>Same gender only</Text>
            <Text style={styles.switchHint}>
              {user?.gender ? "Only riders of your gender can request a seat." : "Set your gender via your roster record to use this."}
            </Text>
          </View>
          <Switch
            value={sameGenderOnly}
            onValueChange={setSameGenderOnly}
            disabled={!user?.gender}
            trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
            thumbColor={colors.surface}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Offer ride" onPress={handleSubmit} loading={isSubmitting} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink },
  subtitle: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm },
  card: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm },
  flex1: { flex: 1, minWidth: 0 },
  chipRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  fieldLabel: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textSecondary },
  timeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  timeInput: { width: 60 },
  colon: { fontSize: typography.size.lg, fontFamily: font.familyMedium, color: colors.textSecondary },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  switchTextGroup: { flex: 1, gap: 2 },
  switchLabel: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  switchHint: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
});
