import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, SoftBlock, Button, Card, EmptyState, ScreenContainer, TextField, colors, font, radius, spacing, typography } from "../../../core/ui";
import { geocodeAddress } from "../data/geocode";
import { listRides, type Ride } from "../data/ridesApi";

export default function RideListScreen() {
  const [destination, setDestination] = useState("");
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Search is destination-only by design: a student picks where they're headed, sees
  // every matching ride regardless of departure point, and compares departures themselves
  // to pick whichever's most convenient. Server still applies the same-gender constraint
  // on every request, so an unfiltered fetch (empty destination) is exactly "every ride
  // this student is allowed to see".
  const search = useCallback(async (destinationText: string) => {
    setError(null);
    setIsSearching(true);
    try {
      const destinationCoords = await geocodeAddress(destinationText);
      const data = await listRides({
        destination: destinationText.trim() || undefined,
        ...(destinationCoords && { destination_lat: destinationCoords.lat, destination_lng: destinationCoords.lng }),
      });
      setRides(data.results);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Search failed.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = () => search(destination);

  // Main screen always opens on the full allowed list; the destination field only narrows
  // it down once the student actually searches, per the button above.
  useFocusEffect(useCallback(() => { search(""); }, [search]));

  return (
    <ScreenContainer style={styles.screen} topBar="rides">
      <FlatList
        data={rides}
        keyExtractor={(ride) => String(ride.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroTitleGroup}>
                  <Text style={styles.title}>Ride Sharing</Text>
                  <Text style={styles.subtitle}>Find a ride or offer one to fellow students</Text>
                </View>
                <View style={styles.heroActions}>
                  <Pressable onPress={() => router.push("/(app)/rides/mine")}>
                    <SoftBlock backgroundColor="rgba(255,255,255,0.15)" borderColor="transparent" pill size={40} flat>
                      <MaterialCommunityIcons name="briefcase-outline" size={18} color={colors.surface} />
                    </SoftBlock>
                  </Pressable>
                  <Pressable onPress={() => router.push("/(app)/rides/notifications")}>
                    <SoftBlock backgroundColor="rgba(255,255,255,0.15)" borderColor="transparent" pill size={40} flat>
                      <MaterialCommunityIcons name="bell-outline" size={18} color={colors.surface} />
                    </SoftBlock>
                  </Pressable>
                </View>
              </View>
              <View style={styles.searchBar}>
                <TextField
                  placeholder="Where are you headed?"
                  value={destination}
                  onChangeText={setDestination}
                  containerStyle={styles.searchInput}
                  style={styles.searchInputField}
                />
                <Button label="Search" onPress={handleSearch} loading={isSearching} style={styles.searchButton} />
              </View>
            </View>

            <View style={styles.belowHero}>
              {error && <Text style={styles.error}>{error}</Text>}
              <Button label="＋ Offer a ride" onPress={() => router.push("/(app)/rides/offer")} />
            </View>
          </View>
        }
        ListEmptyComponent={
          isSearching ? null : (
            <EmptyState icon="car-outline" title="No rides found" subtitle="Try a different destination." />
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.itemPadding} onPress={() => router.push(`/(app)/rides/${item.id}`)}>
            <Card style={styles.rideCard}>
              <View style={styles.rideRow}>
                <Text style={styles.rideRoute}>{item.departure} → {item.destination}</Text>
                {item.same_gender_only && <Badge label="Same gender" tone="tertiary" />}
              </View>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.rideMeta}>{item.departure_date} · {item.departure_time.slice(0, 5)}</Text>
              </View>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="seat-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.rideMeta}>{item.seats_available}/{item.seats_total} seats left · {item.offerer.full_name}</Text>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  listContent: { paddingBottom: spacing.lg, gap: spacing.md, flexGrow: 1 },
  headerGroup: { gap: spacing.md, marginBottom: spacing.xs },
  hero: {
    backgroundColor: colors.primaryContainer,
    borderBottomLeftRadius: radius.hero,
    borderBottomRightRadius: radius.hero,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.md },
  heroTitleGroup: { flex: 1, gap: 2 },
  heroActions: { flexDirection: "row", gap: spacing.sm },
  title: { fontSize: typography.size.xl, fontFamily: font.family, color: colors.surface },
  subtitle: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.onPrimaryContainer },
  searchBar: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  searchInput: { flex: 1 },
  searchInputField: { backgroundColor: colors.surface, borderWidth: 0 },
  searchButton: { flexShrink: 0 },
  belowHero: { paddingHorizontal: spacing.lg, gap: spacing.md },
  itemPadding: { paddingHorizontal: spacing.lg },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  rideCard: { gap: spacing.xs },
  rideRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rideRoute: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink, flexShrink: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  rideMeta: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
});
