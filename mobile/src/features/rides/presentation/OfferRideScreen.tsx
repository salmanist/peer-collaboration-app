import { colors as appColors } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
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
import { fetchMe } from "../../auth/data/authApi";
import { createRide, type RideLocation } from "../data/ridesApi";
import { LocationAutocomplete } from "./LocationAutocomplete";

const dateStr = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const MERIDIEMS = ["AM", "PM"] as const;
const SEAT_OPTIONS = ["1", "2", "3", "4", "5"];

export default function OfferRideScreen() {
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const updateUser = useSessionStore((state) => state.updateUser);

  useState(() => {
    fetchMe().then(updateUser).catch(() => {});
  });

  const datePresets = [
    { label: "Today", value: dateStr(0) },
    { label: "Tomorrow", value: dateStr(1) },
    { label: "In 2 days", value: dateStr(2) },
  ];

  const [departure, setDeparture] = useState<RideLocation | null>(null);
  const [destination, setDestination] = useState<RideLocation | null>(null);
  const [departureDate, setDepartureDate] = useState(dateStr(0));
  const [hour, setHour] = useState("08");
  const [minute, setMinute] = useState("30");
  const [meridiem, setMeridiem] = useState<(typeof MERIDIEMS)[number]>("AM");
  const [seatsTotal, setSeatsTotal] = useState("3");
  const [sameGenderOnly, setSameGenderOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const handleSubmit = async () => {
    setError(null);
    if (!departure || !destination) {
      setError("Pick both a departure and destination location.");
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
      setError("Departure time cannot be in the past.");
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
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/rides")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>Offer a Ride</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Title & Subtitle */}
        <View style={styles.header}>
          <Text style={styles.title}>List an Available Ride</Text>
          <Text style={styles.subtitle}>
            Share your route, departure time, and carpool with peers on campus.
          </Text>
        </View>

        {/* Departure Location */}
        <LocationAutocomplete
          placeholder="Departure Location (e.g. DHA Phase 5, Lahore)"
          value={departure}
          onChange={setDeparture}
        />

        {/* Destination Location */}
        <LocationAutocomplete
          placeholder="Destination (e.g. LGU Campus Main Gate)"
          value={destination}
          onChange={setDestination}
        />

        {/* Departure Date */}
        <TextInput
          style={styles.input}
          placeholder="Departure Date (YYYY-MM-DD)"
          placeholderTextColor={appColors.textMuted}
          value={departureDate}
          onChangeText={setDepartureDate}
        />

        {/* Date Presets Pills */}
        <View style={styles.optionsWrap}>
          {datePresets.map((preset) => {
            const isSelected = departureDate === preset.value;
            return (
              <Pressable
                key={preset.label}
                style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                onPress={() => setDepartureDate(preset.value)}
              >
                <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Departure Time */}
        <Text style={styles.label}>Departure Time *</Text>
        <View style={styles.timeInputRow}>
          <TextInput
            style={[styles.input, styles.timeBox]}
            placeholder="08"
            placeholderTextColor={appColors.textMuted}
            value={hour}
            onChangeText={setHour}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.colon}>:</Text>
          <TextInput
            style={[styles.input, styles.timeBox]}
            placeholder="30"
            placeholderTextColor={appColors.textMuted}
            value={minute}
            onChangeText={setMinute}
            keyboardType="number-pad"
            maxLength={2}
          />

          <View style={styles.optionsWrap}>
            {MERIDIEMS.map((m) => {
              const isSelected = meridiem === m;
              return (
                <Pressable
                  key={m}
                  style={[styles.optionPill, isSelected && styles.optionPillSelected, { paddingHorizontal: 16 }]}
                  onPress={() => setMeridiem(m)}
                >
                  <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Available Seats */}
        <Text style={styles.label}>Available Seats</Text>
        <View style={styles.optionsWrap}>
          {SEAT_OPTIONS.map((num) => {
            const isSelected = seatsTotal === num;
            return (
              <Pressable
                key={num}
                style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                onPress={() => setSeatsTotal(num)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="seat-passenger"
                    size={14}
                    color={isSelected ? appColors.primary : appColors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                    `${num} Seat${Number(num) > 1 ? "s" : ""}`
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Passenger Preference (Same Gender) */}
        <Text style={styles.label}>Passenger Preference</Text>
        <View style={styles.optionsWrap}>
          <Pressable
            style={[styles.optionPill, !sameGenderOnly && styles.optionPillSelected]}
            onPress={() => {
              setSameGenderOnly(false);
              setError(null);
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="account-multiple-outline"
                size={14}
                color={!sameGenderOnly ? appColors.primary : appColors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.optionPillText, !sameGenderOnly && styles.optionPillTextSelected]}>
                "Any Gender"
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.optionPill, sameGenderOnly && styles.optionPillSelected]}
            onPress={() => {
              const g = user?.gender?.toLowerCase();
              if (g === "female" || g === "male") {
                setSameGenderOnly(true);
                setError(null);
              } else {
                setError("Please set your gender in your student profile to enable same-gender rides.");
              }
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name={user?.gender === "female" ? "gender-female" : user?.gender === "male" ? "gender-male" : "account-group"}
                size={14}
                color={sameGenderOnly ? (user?.gender === "female" ? "#BE185D" : "#1D4ED8") : appColors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.optionPillText, sameGenderOnly && styles.optionPillTextSelected]}>
                {sameGenderOnly
                  ? `${user?.gender === "female" ? "Female" : user?.gender === "male" ? "Male" : "Same Gender"} Only`
                  : `Same Gender Only${user?.gender && user.gender !== "other" ? ` (${user.gender})` : ""}`}
              </Text>
            </View>
          </Pressable>
        </View>

        {sameGenderOnly && user?.gender && user.gender !== "other" && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: user.gender === "female" ? "#FDF2F8" : "#EFF6FF", borderWidth: 1, borderColor: user.gender === "female" ? "#FBCFE8" : "#BFDBFE" }}>
            <MaterialCommunityIcons name="shield-check" size={15} color={user.gender === "female" ? "#BE185D" : "#1D4ED8"} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: user.gender === "female" ? "#BE185D" : "#1D4ED8", fontWeight: "600" }}>
              Restricted to verified {user.gender} students only.
            </Text>
          </View>
        )}

        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit Button (Zahra's Signature Gold Button from Image 1 & 2) */}
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={appColors.primary} />
          ) : (
            <Text style={styles.submitButtonText}>Offer Ride</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  topNavBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: appColors.primary,
  },
  container: {
    padding: 16,
    gap: 10,
  },
  header: {
    marginTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: appColors.text,
  },
  subtitle: {
    color: appColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    color: appColors.text,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    padding: 12,
    color: appColors.text,
    fontSize: 14,
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionPill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  optionPillSelected: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.primary,
  },
  optionPillText: {
    color: appColors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  optionPillTextSelected: {
    color: appColors.primary,
    fontWeight: "800",
  },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeBox: {
    width: 60,
    textAlign: "center",
    padding: 10,
  },
  colon: {
    fontSize: 18,
    fontWeight: "700",
    color: appColors.textSecondary,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#FDBF1E",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: appColors.primary,
    fontWeight: "900",
    fontSize: 15,
  },
});
