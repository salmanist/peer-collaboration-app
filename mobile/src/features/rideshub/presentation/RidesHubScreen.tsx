import { API_REQUEST_TIMEOUT_MS } from "../../../core/network/apiClient";
import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ModuleOptionsMenu, type ModuleDropdownItem } from "../../../core/components/ModuleOptionsMenu";
import { useDataStore } from "../../../core/data/DataStore";
import { getCurrentRide, getMyRideProfile, type RideProfile, type OnDemandRide } from "../../ondemand/data/ondemandApi";
import { PeerLiftBoard } from "../../ondemand/presentation/PeerLiftBoard";
import { PIN_LABEL, RideBookingSection, type Stop } from "../../ondemand/presentation/RideBookingSection";
import { getActiveTrip, listAvailableRides, type ActiveTrip, type Ride } from "../../rides/data/ridesApi";
import { TripCard, TripSkeletonList } from "../../rides/presentation/TripCard";
import { usePolling } from "../../ondemand/presentation/usePolling";
import { ActiveTripBanner } from "./ActiveTripBanner";

const TRIPS_CACHE_KEY = "rides:default";

type RidesTab = "scheduled" | "ondemand";

export default function RidesHubScreen() {
  const insets = useSafeAreaInsets();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<RidesTab>(tab === "ondemand" ? "ondemand" : "scheduled");
  const [ondemandSubTab, setOndemandSubTab] = useState<"board" | "booking">("board");
  const [isPeerModalOpen, setIsPeerModalOpen] = useState(false);
  const [profile, setProfile] = useState<RideProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [currentRide, setCurrentRide] = useState<OnDemandRide | null>(null);
  // The trip under way (any ride feature); shown pinned above the tabs so it is always the first thing seen.
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [drop, setDrop] = useState<Stop | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setSearchQuery(searchText.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchText]);
  const [trips, setTrips] = useState<Ride[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const latestTripsRequest = useRef(0);
  const [tripsRetry, setTripsRetry] = useState(0);
  const { getCache, setCache } = useDataStore();

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  useFocusEffect(
    useCallback(() => {
      Promise.all([getMyRideProfile(), getCurrentRide()])
        .then(([loadedProfile, currentRide]) => {
          setProfile(loadedProfile);
          setCurrentRide(currentRide);
          setProfileError(null);
        })
        .catch(() => setProfileError("Couldn't load your ride details. Check your connection."))
        .finally(() => setIsProfileLoading(false));
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const requestId = ++latestTripsRequest.current;

      // Stale-while-revalidate: immediately display cached trips if available
      let hasCached = false;
      if (!drop && !searchQuery) {
        const cached = getCache<Ride[]>(TRIPS_CACHE_KEY);
        if (cached && cached.length > 0) {
          setTrips(cached);
          setIsLoadingTrips(false);
          hasCached = true;
        }
      }

      const controller = new AbortController();
      const deadline = setTimeout(() => {
        if (requestId === latestTripsRequest.current) {
          if (!hasCached) {
            setTripsError("Rides are taking too long to load. Check your connection and retry.");
          }
          setIsLoadingTrips(false);
        }
        controller.abort();
      }, API_REQUEST_TIMEOUT_MS + 1000);

      setTripsError(null);
      if (!hasCached) {
        setIsLoadingTrips(true);
      }

      listAvailableRides(
        drop
          ? {
              q: searchQuery || undefined,
              destination_lat: drop.lat,
              destination_lng: drop.lng,
              destination: drop.label === PIN_LABEL ? undefined : drop.label,
            }
          : { q: searchQuery || undefined },
        {
          signal: controller.signal,
          onPage: (rides) => {
            if (requestId === latestTripsRequest.current && !controller.signal.aborted) {
              setTrips(rides);
              setIsLoadingTrips(false);
            }
          },
        },
      )
        .then((data) => {
          if (requestId !== latestTripsRequest.current || controller.signal.aborted) return;
          setTrips(data.results);
          if (!drop && !searchQuery) setCache(TRIPS_CACHE_KEY, data.results);
        })
        .catch((err: any) => {
          if (requestId === latestTripsRequest.current && !controller.signal.aborted) {
            if (!hasCached) {
              setTripsError(err?.response?.data?.detail ?? "Couldn't load rides. Check your connection and retry.");
            }
          }
        })
        .finally(() => {
          clearTimeout(deadline);
          if (requestId === latestTripsRequest.current) {
            setIsLoadingTrips(false);
          }
        });
      return () => {
        latestTripsRequest.current += 1;
        clearTimeout(deadline);
        controller.abort();
      };
    }, [drop, searchQuery, tripsRetry, getCache, setCache]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [loadedProfile, activeRide, ridesData] = await Promise.all([
        getMyRideProfile().catch(() => null),
        getCurrentRide().catch(() => null),
        listAvailableRides(
          drop
            ? {
                q: searchQuery || undefined,
                destination_lat: drop.lat,
                destination_lng: drop.lng,
                destination: drop.label === PIN_LABEL ? undefined : drop.label,
              }
            : { q: searchQuery || undefined },
        ).catch(() => null),
      ]);
      if (loadedProfile) setProfile(loadedProfile);
      if (activeRide !== undefined) setCurrentRide(activeRide);
      if (ridesData?.results) {
        setTrips(ridesData.results);
        if (!drop && !searchQuery) setCache(TRIPS_CACHE_KEY, ridesData.results);
        setTripsError(null);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [drop, searchQuery, setCache]);

  useFocusEffect(useCallback(() => {
    if (activeTab !== "scheduled") return;
    const timer = setInterval(() => setTripsRetry(value => value + 1), 30000);
    return () => clearInterval(timer);
  }, [activeTab]));

  const handleRouteChange = useCallback((_pickup: Stop | null, nextDrop: Stop | null) => {
    setDrop(nextDrop);
  }, []);

  const isApprovedDriver = profile?.role === "driver" && profile.is_approved;
  const isPendingDriver = profile?.role === "driver" && !profile.is_approved;

  usePolling(async () => {
    try {
      setActiveTrip(await getActiveTrip());
    } catch {
      // keep whatever was shown during a brief connection drop
    }
  }, 15000);

  usePolling(async () => {
    if (activeTab !== "ondemand") return;
    try {
      setCurrentRide(await getCurrentRide());
    } catch {
      // Keep the last known ride visible during a temporary connection failure.
    }
  });

  const dropdownItems: ModuleDropdownItem[] = useMemo(
    () => [
      {
        key: "my_trips",
        label: "My Offered Trips",
        subtitle: "Manage your departures & bookings",
        icon: "car-clock",
        iconColor: appColors.primary,
        onPress: () => router.push("/(app)/rides/mine" as any),
      },
      {
        key: "history",
        label: "Ride History",
        subtitle: "Your offered, requested, and real-time rides",
        icon: "history",
        iconColor: appColors.gold,
        onPress: () => router.push("/(app)/rides/history" as any),
      },
    ],
    [],
  );

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={[styles.compactTopNav, { paddingTop: topOffset > 0 ? topOffset : 4 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={styles.compactNavTitle}>Ride Sharing</Text>
        </View>
        <ModuleOptionsMenu items={dropdownItems} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color={appColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === "scheduled" ? "Search area, destination, driver…" : "Search live pickup, destination, student…"}
            accessibilityLabel="Search available rides"
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              setSearchQuery(text);
            }}
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!searchText && (
            <Pressable
              onPress={() => {
                setSearchText("");
                setSearchQuery("");
              }}
              accessibilityLabel="Clear ride search"
              hitSlop={8}
            >
              <MaterialCommunityIcons name="close" size={18} color={appColors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {activeTrip && <ActiveTripBanner trip={activeTrip} />}

      {/* Mode Switcher Tabs */}
      <View style={styles.modeTabsContainer}>
        <Pressable
          style={[styles.modeTab, activeTab === "scheduled" && styles.modeTabActive]}
          onPress={() => setActiveTab("scheduled")}
        >
          <View style={styles.modeTabContentRow}>
            <MaterialCommunityIcons
              name="calendar-clock"
              size={15}
              color={activeTab === "scheduled" ? appColors.primary : appColors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeTabText, activeTab === "scheduled" && styles.modeTabTextActive]}>
              Scheduled Carpools
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.modeTab, activeTab === "ondemand" && styles.modeTabActive]}
          onPress={() => setActiveTab("ondemand")}
        >
          <View style={styles.modeTabContentRow}>
            <MaterialCommunityIcons
              name="car-side"
              size={15}
              color={activeTab === "ondemand" ? appColors.primary : appColors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeTabText, activeTab === "ondemand" && styles.modeTabTextActive]}>
              Ride Now (On-Demand)
            </Text>
          </View>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 85, 110) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[appColors.primary]}
            tintColor={appColors.primary}
          />
        }
      >
        {activeTab === "scheduled" ? (
          <>
            {drop && (
              <View style={styles.filterChipRow}>
                <Text style={styles.filterChipLabel}>Filter: Heading to {drop.label}</Text>
                <Pressable onPress={() => setDrop(null)}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={appColors.textSecondary} />
                </Pressable>
              </View>
            )}

            {/* Trips List */}
            {tripsError && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.danger} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{tripsError}</Text>
                <Pressable accessibilityRole="button" onPress={() => setTripsRetry(value => value + 1)} hitSlop={8}><Text style={{ color: appColors.primary, fontWeight: "700" }}>Retry</Text></Pressable>
              </View>
            )}

            {isLoadingTrips && trips.length === 0 ? (
              <TripSkeletonList />
            ) : tripsError && trips.length === 0 ? null : trips.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="car-outline" size={50} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>{searchQuery ? "No matching rides" : "No Scheduled Trips Available"}</Text>
                <Text style={styles.emptySub}>
                  {searchQuery ? "Try another area, destination, or driver name." : drop
                    ? "No student carpools heading there right now. Switch to 'Ride Now' or offer a trip!"
                    : "Nobody has posted a carpool yet. Be the first to offer a seat!"}
                </Text>
              </View>
            ) : (
              trips.map((trip) => <TripCard key={trip.id} ride={trip} />)
            )}
          </>
        ) : (
          /* On-Demand Ride Tab: Direct Real-Time Lift Board */
          <View style={styles.ondemandSection}>
            <PeerLiftBoard
              isModalOpen={isPeerModalOpen}
              onCloseModal={() => setIsPeerModalOpen(false)}
              onOpenModal={() => setIsPeerModalOpen(true)}
              searchQuery={searchQuery}
            />
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <Pressable
        style={[
          styles.floatingAddBtn,
          { bottom: Math.max(insets.bottom + 65, 80) },
        ]}
        accessibilityRole="button"
        accessibilityLabel={activeTab === "ondemand" ? "Post immediate ride" : "Offer a trip"}
        hitSlop={8}
        onPress={() => {
          if (activeTab === "ondemand") {
            setIsPeerModalOpen(true);
          } else {
            router.push("/(app)/rides/offer" as any);
          }
        }}
      >
        <MaterialCommunityIcons name="plus" size={28} color={appColors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  compactTopNav: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    backgroundColor: appColors.headerBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 4 + headerGrow,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: appColors.headerBg,
  },
  compactNavTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: appColors.onHeader,
    letterSpacing: -0.3,
  },
  modeTabsContainer: {
    flexDirection: "row",
    backgroundColor: appColors.border,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  modeTabContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabActive: {
    backgroundColor: appColors.white,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.035,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.textSecondary,
    textAlign: "center",
  },
  modeTabTextActive: {
    color: appColors.primary,
    fontWeight: "800",
  },
  subModeTabsContainer: {
    flexDirection: "row",
    backgroundColor: appColors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 3,
    marginBottom: 4,
  },
  subModeTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  subModeTabActive: {
    backgroundColor: appColors.white,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  subModeTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.textSecondary,
    textAlign: "center",
  },
  subModeTabTextActive: {
    color: appColors.primary,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: appColors.border, borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 13, fontSize: 14, color: appColors.text },
  filterChipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  filterChipLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.primary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: appColors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  ondemandSection: {
    gap: 12,
  },
  activeRideCard: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 10,
  },
  activeRideIconCircle: {
    width: 60,
    height: 60,


    alignItems: "center",
    justifyContent: "center",
  },
  activeRideTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.text,
  },
  activeRideSubtitle: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
  },
  driverCard: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 14,
  },
  driverCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  driverHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: appColors.text,
  },
  driverSub: {
    fontSize: 12,
    color: appColors.textSecondary,
  },
  approvedBadge: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  approvedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.amber50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.amber200,
  },
  pendingBannerText: {
    flex: 1,
    fontSize: 12,
    color: appColors.icon,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: appColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: appColors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.red50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: appColors.danger,
    fontWeight: "600",
  },
  floatingAddBtn: {
    position: "absolute",
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: appColors.primary,
    borderWidth: 1.5,
    borderColor: appColors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
});
