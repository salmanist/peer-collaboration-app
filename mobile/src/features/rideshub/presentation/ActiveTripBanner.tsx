import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "../../../core/ui/AppText";
import { colors as appColors } from "../../../core/ui/theme";
import type { ActiveTrip } from "../../rides/data/ridesApi";

// Where tapping the banner leads for each kind of trip.
function openTrip(trip: ActiveTrip) {
  if (trip.type === "scheduled") router.push(`/(app)/rides/${trip.id}` as any);
  else if (trip.type === "ondemand") router.push("/(app)/ondemand/ride" as any);
  else {
    router.push({
      pathname: "/(app)/ondemand/chat/[requestId]",
      params: { requestId: String(trip.id), partnerName: trip.partner_name ?? "", routeSummary: `${trip.from} → ${trip.to}` },
    } as any);
  }
}

// Pinned above the ride lists for as long as the student has a trip under way.
export function ActiveTripBanner({ trip }: { trip: ActiveTrip }) {
  return (
    <Pressable style={styles.card} onPress={() => openTrip(trip)} accessibilityRole="button">
      <MaterialCommunityIcons name="car-clock" size={26} color={appColors.primary} />
      <View style={styles.body}>
        <Text style={styles.title}>Your ride is in progress</Text>
        <Text style={styles.route} numberOfLines={1}>{trip.from} → {trip.to}</Text>
        <Text style={styles.note}>Finish it before offering or requesting another ride.</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={appColors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    backgroundColor: appColors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.primary,
    shadowColor: appColors.text,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3, color: appColors.primary },
  route: { fontSize: 14, fontWeight: "600", color: appColors.text },
  note: { fontSize: 12, fontWeight: "500", color: appColors.textMuted },
});
