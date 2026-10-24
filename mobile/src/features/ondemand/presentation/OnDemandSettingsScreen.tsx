import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
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
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Skeleton } from "../../../core/components/Skeleton";
import { applyToDrive, getMyRideProfile, stopDriving, type RideProfile } from "../data/ondemandApi";

const SEAT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function OnDemandSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [profile, setProfile] = useState<RideProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColour, setVehicleColour] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleSeats, setVehicleSeats] = useState("3");
  const [isConfirmingStop, setIsConfirmingStop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/rides" as any);
    }
  };

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
    if (!vehicleMake.trim() || !vehicleModel.trim() || !vehicleColour.trim() || !plateNumber.trim()) {
      setError("Please fill in all vehicle information.");
      return;
    }

    const seats = Number(vehicleSeats);
    if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
      setError("Seats must be a whole number between 1 and 8.");
      return;
    }
    setIsBusy(true);
    try {
      const updated = await applyToDrive({
        vehicle_make: vehicleMake.trim(),
        vehicle_model: vehicleModel.trim(),
        vehicle_colour: vehicleColour.trim(),
        plate_number: plateNumber.trim(),
        vehicle_seats: seats,
      });
      setProfile(updated);
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
      <View style={styles.container}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
          </Pressable>
          <Text style={styles.topNavTitle}>Driver Settings</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
          <Skeleton width={160} height={24} borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={16} borderRadius={4} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={260} borderRadius={16} style={{ marginBottom: 16 }} />
        </ScrollView>
      </View>
    );
  }

  const isDriver = profile.role === "driver";

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>{isDriver ? "Driver Profile" : "Become a Driver"}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={appColors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!isDriver && (
          <View style={styles.card}>
            <Text style={styles.cardSectionHeading}>Vehicle Information</Text>

            {/* Make */}
            <View style={styles.formGroup}>
              <TextInput
                style={styles.textInput}
                placeholder="Vehicle Make (e.g. Honda, Toyota, Suzuki)"
                placeholderTextColor={appColors.textMuted}
                value={vehicleMake}
                onChangeText={setVehicleMake}
              />
            </View>

            {/* Model */}
            <View style={styles.formGroup}>
              <TextInput
                style={styles.textInput}
                placeholder="Vehicle Model (e.g. Civic, Corolla, Alto)"
                placeholderTextColor={appColors.textMuted}
                value={vehicleModel}
                onChangeText={setVehicleModel}
              />
            </View>

            {/* Colour */}
            <View style={styles.formGroup}>
              <TextInput
                style={styles.textInput}
                placeholder="Vehicle Colour (e.g. White, Silver, Black)"
                placeholderTextColor={appColors.textMuted}
                value={vehicleColour}
                onChangeText={setVehicleColour}
              />
            </View>

            {/* Plate Number */}
            <View style={styles.formGroup}>
              <TextInput
                style={[styles.textInput, { letterSpacing: 1, fontWeight: "700" }]}
                placeholder="License Plate Number (e.g. LEA-1234)"
                placeholderTextColor={appColors.textMuted}
                value={plateNumber}
                onChangeText={setPlateNumber}
                autoCapitalize="characters"
              />
            </View>

            {/* Seats */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Available Passenger Seats *</Text>
              <Text style={styles.hint}>How many passengers can comfortably sit in your car?</Text>
              <View style={styles.seatsRow}>
                {SEAT_OPTIONS.map((num) => {
                  const isSelected = vehicleSeats === String(num);
                  return (
                    <Pressable
                      key={num}
                      style={[styles.seatPill, isSelected && styles.seatPillActive]}
                      onPress={() => setVehicleSeats(String(num))}
                    >
                      <Text style={[styles.seatPillText, isSelected && styles.seatPillTextActive]}>
                        {num} {num === 1 ? "seat" : "seats"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.primaryBtn, isBusy && styles.btnDisabled]}
              onPress={submitApplication}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator color={appColors.primary} />
              ) : (
                <View style={styles.btnContentRow}>
                  <MaterialCommunityIcons name="check-circle-outline" size={20} color={appColors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Submit Driver Application</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {isDriver && (
          <View style={{ gap: 14 }}>
            {/* Status Card */}
            <View style={styles.card}>
              <View style={styles.statusHeaderRow}>
                <View>
                  <Text style={styles.statusTitle}>
                    {profile.is_approved ? "Approved Campus Driver" : "Application Pending Review"}
                  </Text>
                  <Text style={styles.statusSubtitle}>
                    {profile.is_approved
                      ? "You can go online and accept peer ride requests."
                      : "An admin is reviewing your vehicle details. You can still request rides."}
                  </Text>
                </View>
                <View style={[styles.statusBadge, profile.is_approved ? styles.statusBadgeSuccess : styles.statusBadgeWarning]}>
                  <MaterialCommunityIcons
                    name={profile.is_approved ? "check-decagram" : "clock-outline"}
                    size={14}
                    color={profile.is_approved ? appColors.primary : appColors.amber700}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      profile.is_approved ? styles.statusBadgeTextSuccess : styles.statusBadgeTextWarning,
                    ]}
                  >
                    {profile.is_approved ? "Approved" : "Under Review"}
                  </Text>
                </View>
              </View>

              {/* Vehicle Specs Box */}
              <View style={styles.vehicleBox}>
                <View style={styles.vehicleIconCircle}>
                  <MaterialCommunityIcons name="car" size={24} color={appColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleName}>
                    {profile.vehicle_colour} {profile.vehicle_make} {profile.vehicle_model}
                  </Text>
                  <View style={styles.vehicleChipsRow}>
                    <View style={styles.plateChip}>
                      <Text style={styles.plateChipText}>{profile.plate_number}</Text>
                    </View>
                    <View style={styles.seatChip}>
                      <MaterialCommunityIcons name="seatbelt" size={13} color={appColors.textSecondary} style={{ marginRight: 3 }} />
                      <Text style={styles.seatChipText}>{profile.vehicle_seats} Seats</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Direct Link to Driver Mode if Approved */}
              {profile.is_approved && (
                <Pressable
                  style={[styles.primaryBtn, { marginTop: 12 }]}
                  onPress={() => router.push("/(app)/ondemand/drive" as any)}
                >
                  <View style={styles.btnContentRow}>
                    <MaterialCommunityIcons name="steering" size={20} color={appColors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.primaryBtnText}>Open Driver Mode</Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* Withdrawal / Exit Section */}
            <View style={styles.card}>
              <Text style={styles.cardSectionHeading}>Driver Settings</Text>
              {!isConfirmingStop ? (
                <Pressable
                  style={styles.dangerOutlineBtn}
                  onPress={() => setIsConfirmingStop(true)}
                  disabled={isBusy}
                >
                  <MaterialCommunityIcons
                    name={profile.is_approved ? "account-cancel-outline" : "close-circle-outline"}
                    size={18}
                    color={appColors.danger}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.dangerOutlineBtnText}>
                    {profile.is_approved ? "Stop being a driver" : "Withdraw application"}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmText}>
                    {profile.is_approved
                      ? "Are you sure? You will switch back to passenger mode and your registered vehicle will be cleared. To drive again, you will need to re-apply."
                      : "Are you sure you want to withdraw your pending driver application?"}
                  </Text>
                  <View style={styles.confirmActionsRow}>
                    <Pressable
                      style={[styles.dangerSolidBtn, isBusy && styles.btnDisabled]}
                      onPress={stop}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <ActivityIndicator color={appColors.white} size="small" />
                      ) : (
                        <Text style={styles.dangerSolidBtnText}>Yes, Confirm</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={styles.cancelGhostBtn}
                      onPress={() => setIsConfirmingStop(false)}
                      disabled={isBusy}
                    >
                      <Text style={styles.cancelGhostBtnText}>Keep Status</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.white,
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
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  headerBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  iconCircle: {
    width: 44,
    height: 44,




    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: appColors.textSecondary,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: appColors.red300,
  },
  errorText: {
    flex: 1,
    color: appColors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    backgroundColor: appColors.white,
    padding: 0,
  },
  cardSectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: appColors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: appColors.text,
  },
  seatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  seatPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  seatPillActive: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.primary,
  },
  seatPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  seatPillTextActive: {
    color: appColors.primary,
    fontWeight: "800",
  },
  primaryBtn: {
    backgroundColor: appColors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
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
  btnDisabled: {
    opacity: 0.6,
  },
  statusHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.text,
  },
  statusSubtitle: {
    fontSize: 12,
    color: appColors.textSecondary,
    marginTop: 2,
    maxWidth: 220,
    lineHeight: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: appColors.surfaceMuted,
  },
  statusBadgeWarning: {
    backgroundColor: appColors.surfaceMuted,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusBadgeTextSuccess: {
    color: appColors.primary,
  },
  statusBadgeTextWarning: {
    color: appColors.amber700,
  },
  vehicleBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 12,
  },
  vehicleIconCircle: {
    width: 44,
    height: 44,


    justifyContent: "center",
    alignItems: "center",
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: "800",
    color: appColors.text,
  },
  vehicleChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  plateChip: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  plateChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: appColors.text,
    letterSpacing: 0.5,
  },
  seatChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  seatChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  dangerOutlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appColors.red50,
    borderWidth: 1,
    borderColor: appColors.red300,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dangerOutlineBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.danger,
  },
  confirmBox: {
    backgroundColor: appColors.redTint,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.red200,
  },
  confirmText: {
    fontSize: 13,
    color: appColors.red900,
    lineHeight: 18,
    marginBottom: 12,
  },
  confirmActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  dangerSolidBtn: {
    flex: 1,
    backgroundColor: appColors.danger,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerSolidBtnText: {
    color: appColors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  cancelGhostBtn: {
    flex: 1,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelGhostBtnText: {
    color: appColors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
});
