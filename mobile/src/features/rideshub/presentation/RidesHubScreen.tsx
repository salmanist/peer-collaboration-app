import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useDataStore } from "../../../core/data/DataStore";
import { Badge, Button, Card, EmptyState, OverscrollFill, ScreenContainer, Skeleton, SoftBlock, colors, font, radius, spacing, typography } from "../../../core/ui";
import { getCurrentRide, getMyRideProfile, type RideProfile } from "../../ondemand/data/ondemandApi";
import { PIN_LABEL, RideBookingSection, type Stop } from "../../ondemand/presentation/RideBookingSection";
import { listRides, type Ride } from "../../rides/data/ridesApi";
import { TripCard, TripSkeletonList } from "../../rides/presentation/TripCard";

// Cache key for the unfiltered trip list - the one view every focus loads. A list filtered by
// drop-off is never cached, since "everything" isn't a valid answer to "just trips to DHA".
const TRIPS_CACHE_KEY = "rides:default";

// Room in the green hero where the first card sits, so the card overlaps the hero.
const HERO_OVERLAP = 56 + spacing.lg;

// One Rides screen: ask for a ride right now (on-demand) and see scheduled trips going the same way.
// This is the only place that knows about both modules; each stays independent of the other.
export default function RidesHubScreen() {
  const [profile, setProfile] = useState<RideProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [drop, setDrop] = useState<Stop | null>(null);
  const [trips, setTrips] = useState<Ride[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const latestTripsRequest = useRef(0);
  const { getCache, setCache } = useDataStore();

  useFocusEffect(
    useCallback(() => {
      Promise.all([getMyRideProfile(), getCurrentRide()])
        .then(([loadedProfile, currentRide]) => {
          setProfile(loadedProfile);
          setHasActiveRide(!!currentRide);
          setProfileError(null);
        })
        .catch(() => setProfileError("Couldn't load your ride details. Check your connection."))
        .finally(() => setIsProfileLoading(false));
    }, []),
  );

  // Trips follow the drop-off: destination-only matching (a student says where they are headed and
  // compares departure points themselves), same rule the old trip board used. Reloads on focus too.
  useFocusEffect(
    useCallback(() => {
      const requestId = ++latestTripsRequest.current;

      if (!drop) {
        const cached = getCache<Ride[]>(TRIPS_CACHE_KEY);
        if (cached) {
          setTrips(cached);
          setIsLoadingTrips(false);
          return;
        }
      }

      setTripsError(null);
      setIsLoadingTrips(true);
      listRides(
        drop
          ? {
              destination_lat: drop.lat,
              destination_lng: drop.lng,
              // A free map pin has no real name to text-match on.
              destination: drop.label === PIN_LABEL ? undefined : drop.label,
            }
          : undefined,
      )
        .then((data) => {
          // Ignore answers to an older drop-off if the student has already picked another.
          if (requestId !== latestTripsRequest.current) return;
          setTrips(data.results);
          if (!drop) setCache(TRIPS_CACHE_KEY, data.results);
        })
        .catch((err: any) => requestId === latestTripsRequest.current && setTripsError(err?.response?.data?.detail ?? "Couldn't load scheduled trips."))
        .finally(() => requestId === latestTripsRequest.current && setIsLoadingTrips(false));
    }, [drop, getCache, setCache]),
  );

  const handleRouteChange = useCallback((_pickup: Stop | null, nextDrop: Stop | null) => setDrop(nextDrop), []);

  const isApprovedDriver = profile?.role === "driver" && profile.is_approved;
  const isPendingDriver = profile?.role === "driver" && !profile.is_approved;

  const renderFirstCard = () => {
    if (isProfileLoading) return <Skeleton style={styles.skeleton} />;
    if (!profile) {
      return (
        <Card contentStyle={styles.card}>
          <Text style={styles.error}>{profileError ?? "Something went wrong."}</Text>
        </Card>
      );
    }
    if (hasActiveRide) {
      return (
        <Card contentStyle={styles.card}>
          <Text style={styles.heading}>You have a ride in progress</Text>
          <Button label="Open my current ride" onPress={() => router.push("/(app)/ondemand/ride")} />
        </Card>
      );
    }
    // Approved drivers don't book rides - they go online and accept requests.
    if (isApprovedDriver) {
      return (
        <Card contentStyle={styles.card}>
          <View style={styles.row}>
            <Text style={styles.heading}>You are a driver</Text>
            <Badge label="Approved" tone="success" />
          </View>
          <Text style={styles.body}>
            {profile.vehicle_colour} {profile.vehicle_make} {profile.vehicle_model} · {profile.plate_number} · {profile.vehicle_seats} seats
          </Text>
          <Button label="Driver mode: go online" onPress={() => router.push("/(app)/ondemand/drive")} />
        </Card>
      );
    }
    return <RideBookingSection onRouteChange={handleRouteChange} />;
  };

  return (
    <ScreenContainer scroll topBar="rides" style={styles.screen}>
      <View style={styles.hero}>
        <OverscrollFill />
        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleGroup}>
            <Text style={styles.title}>Rides</Text>
            <Text style={styles.subtitle}>Ride now, or find a trip going your way</Text>
          </View>
          <View style={styles.heroActions}>
            <HeroButton icon="plus" label="Offer a trip" href="/(app)/rides/offer" />
            <HeroButton icon="briefcase-outline" label="My trips" href="/(app)/rides/mine" />
            <HeroButton icon="cog-outline" label="On-demand settings" href="/(app)/ondemand/settings" />
            <HeroButton icon="bell-outline" label="Notifications" href="/(app)/rides/notifications" />
          </View>
        </View>
      </View>

      <View style={styles.belowHero}>
        {renderFirstCard()}

        {isPendingDriver && !hasActiveRide && (
          <Pressable onPress={() => router.push("/(app)/ondemand/settings")}>
            <Card contentStyle={styles.row}>
              <Text style={[styles.body, styles.flex1]}>Your driver application is waiting for admin approval.</Text>
              <Badge label="Pending" tone="warning" />
            </Card>
          </Pressable>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{drop ? "Scheduled trips going your way" : "Scheduled trips"}</Text>
          {drop && <Text style={styles.body}>Heading to {drop.label}</Text>}
        </View>

        {tripsError && <Text style={styles.error}>{tripsError}</Text>}
        {isLoadingTrips && trips.length === 0 ? (
          <TripSkeletonList />
        ) : trips.length === 0 ? (
          <EmptyState
            icon="car-outline"
            title="No scheduled trips"
            subtitle={drop ? "No trips to that place right now. Request a ride above, or offer a trip." : "Nobody has offered a trip yet."}
          />
        ) : (
          trips.map((trip) => <TripCard key={trip.id} ride={trip} />)
        )}
      </View>
    </ScreenContainer>
  );
}

function HeroButton({ icon, label, href }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; href: string }) {
  return (
    <Pressable onPress={() => router.push(href as never)} accessibilityRole="button" accessibilityLabel={label}>
      <SoftBlock backgroundColor="rgba(255,255,255,0.15)" borderColor="transparent" pill size={40} flat>
        <MaterialCommunityIcons name={icon} size={18} color={colors.surface} />
      </SoftBlock>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screen: { padding: 0 },
  hero: {
    backgroundColor: colors.primaryContainer,
    borderBottomLeftRadius: radius.hero,
    borderBottomRightRadius: radius.hero,
    padding: spacing.lg,
    paddingBottom: HERO_OVERLAP,
    gap: spacing.xs,
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.md },
  heroTitleGroup: { flex: 1, gap: 2 },
  heroActions: { flexDirection: "row", gap: spacing.xs },
  title: { fontSize: typography.size.xl, fontFamily: font.family, color: colors.surface },
  subtitle: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.onPrimaryContainer },
  // Pulled up so the first card sits over the hero.
  belowHero: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: -HERO_OVERLAP },
  card: { gap: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  sectionHeader: { gap: 2, marginTop: spacing.sm },
  sectionTitle: { fontSize: typography.size.lg, fontFamily: font.familyMedium, color: colors.ink },
  heading: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  body: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  skeleton: { height: 120, borderRadius: 16 },
});
