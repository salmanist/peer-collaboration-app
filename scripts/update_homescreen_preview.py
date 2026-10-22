import os

content = '''import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
import { FelloLogo } from "../../../core/components/FelloLogo";
import { useCollapsibleHeader } from "../../../core/navigation/useCollapsibleHeader";
import { useModuleUsageStore } from "../../../core/store/useModuleUsageStore";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { useResourceNotificationStore } from "../../resources/resourceNotifications";
import { useLostAndFoundNotificationStore } from "../../lost_and_found/lostAndFoundNotifications";
import { useTutoringNotificationStore } from "../../tutoring/tutoringNotifications";
import { useCampusNotificationStore } from "../../notifications/useCampusNotificationStore";
import { fetchResourceListings } from "../../resources/data/resourcesApi";
import { fetchTutors } from "../../tutoring/data/tutoringApi";
import { fetchLostAndFoundItems } from "../../lost_and_found/data/lostAndFoundApi";

const LGU_CAMPUS_IMAGE = require("../../../../assets/lgu_campus.png");
const CARNIVAL_IMAGE = require("../../../../assets/carnival_highlight.png");
const STUDENTS_STUDY_IMAGE = require("../../../../assets/students_study.png");
const LGU_BUILDING_IMAGE = require("../../../../assets/lgu_building.png");

interface CampusSpotlightEvent {
  id: string;
  tag: string;
  icon: string;
  title: string;
  eventDate: string;
  dateTime: string;
  venue: string;
  description: string;
  ctaText: string;
}

const ALL_CAMPUS_EVENTS: CampusSpotlightEvent[] = [
  {
    id: "evt-carnival",
    tag: "Campus Spotlight",
    icon: "party-popper",
    title: "LGU Annual Winter Carnival",
    eventDate: "2026-11-27T10:00:00",
    dateTime: "Nov 27, 2026 · 10:00 AM",
    venue: "Main Campus Grounds",
    description: "The biggest annual winter festival is coming! Enjoy 30+ student food stalls, live acoustic music stage, e-gaming tournament, and startup showcases.",
    ctaText: "View Details",
  },
  {
    id: "evt-tech-talk",
    tag: "Campus Spotlight",
    icon: "laptop-account",
    title: "Tech Talk: Building Scalable Systems",
    eventDate: "2026-10-10T11:00:00",
    dateTime: "Oct 10, 2026 · 11:00 AM",
    venue: "LGU Auditorium",
    description: "Join industry leaders as they share architecture principles for engineering ultra-high-throughput systems and resilient microservices. Open to all students.",
    ctaText: "View Details",
  },
  {
    id: "evt-mids",
    tag: "Academic Spotlight",
    icon: "file-document-edit-outline",
    title: "Fall 2026 Midterm Date Sheet & Hall Guidelines",
    eventDate: "2026-11-09T08:30:00",
    dateTime: "Nov 09, 2026 · 08:30 AM",
    venue: "Examination Block A & C",
    description: "Official Midterm Date Sheet has been announced for all departments. Student ID cards are mandatory for examination entry.",
    ctaText: "View Details",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const spotlightScrollRef = useRef<ScrollView>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [serviceQuery, setServiceQuery] = useState("");

  const upcomingEvents = ALL_CAMPUS_EVENTS;
  const cardWidth = Math.max(width - 40, 250);

  const [selectedEventForModal, setSelectedEventForModal] = useState<CampusSpotlightEvent | null>(null);

  const user = useSessionStore((state) => state.user);
  const accessToken = useSessionStore((state) => state.accessToken);
  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const { headerTranslateY, handleScroll } = useCollapsibleHeader(topOffset + 44);

  const pendingTutoringRequests = useTutoringNotificationStore((state) => state.pendingRequestsCount);
  const hasNewLostClaims = useLostAndFoundNotificationStore((state) => state.hasNewClaims);
  const hasNewResources = useResourceNotificationStore((state) => state.hasNewResources);

  const recordVisit = useModuleUsageStore((state) => state.recordVisit);
  const hydrateUsage = useModuleUsageStore((state) => state.hydrate);

  const {
    resourceListings,
    setResourceListings,
    tutors,
    setTutors,
    lostAndFoundItems,
    setLostAndFoundItems,
  } = useDataStore();

  const loadData = async () => {
    try {
      const [resData, tutorData, lostData] = await Promise.allSettled([
        fetchResourceListings({ page: 1 }),
        fetchTutors({ page: 1 }),
        fetchLostAndFoundItems({ page: 1 }),
      ]);

      if (resData.status === "fulfilled" && resData.value?.results) {
        setResourceListings(resData.value.results);
      }
      if (tutorData.status === "fulfilled" && tutorData.value?.results) {
        setTutors(tutorData.value.results);
      }
      if (lostData.status === "fulfilled" && lostData.value?.results) {
        setLostAndFoundItems(lostData.value.results);
      }
    } catch {}
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  useEffect(() => {
    void hydrateUsage();
    void loadData();
  }, [hydrateUsage]);

  const unseenCount = useCampusNotificationStore((state) => state.unseenCount);
  const fetchNotifications = useCampusNotificationStore((state) => state.fetchNotifications);
  const openCenter = useCampusNotificationStore((state) => state.openCenter);

  useEffect(() => {
    if (accessToken) {
      void fetchNotifications();
    }
  }, [accessToken, fetchNotifications]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  if (!user) return null;

  const displayName = user.full_name || user.display_name || "Syeda Zahra Ijaz";

  const handleRideSharePress = () => router.push("/(app)/rides" as any);
  const handlePrintCenterPress = () => router.push("/(app)/printing" as any);
  const handleDigitalLibraryPress = () => router.push("/(app)/library" as any);

  const searchableServices = [
    { label: "Tutoring", keywords: "tutor tutors study mentor mentors skills", icon: "school-outline" as const, route: "/(app)/tutoring" },
    { label: "Marketplace", keywords: "buy sell share books resources", icon: "storefront-outline" as const, route: "/(app)/resources" },
    { label: "Digital Library", keywords: "notes projects papers", icon: "book-open-variant" as const, route: "/(app)/library" },
    { label: "Lost & Found", keywords: "missing items notices", icon: "magnify" as const, route: "/(app)/lost-and-found" },
    { label: "Ride Sharing", keywords: "ride rides carpool driver transport trip trips cars", icon: "car-outline" as const, route: "/(app)/rides" },
    { label: "Print Center", keywords: "printing printer documents", icon: "printer-outline" as const, route: "/(app)/printing" },
  ].filter(item => `${item.label} ${item.keywords}`.toLowerCase().includes(serviceQuery.trim().toLowerCase()));

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar matching Preview */}
      <Animated.View
        style={[
          styles.collapsibleTopBar,
          {
            paddingTop: topOffset > 0 ? topOffset + 4 : 10,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={styles.topNavLeft}>
          <FelloLogo size={24} variant="yellow" />
          <View style={styles.brandTitleWrap}>
            <Text style={styles.topNavBrand}>Fello</Text>
            <Text style={styles.universityLabel}>LAHORE GARRISON UNIVERSITY</Text>
          </View>
        </View>

        <View style={styles.topRightActions}>
          <Pressable
            style={styles.notificationHeaderButton}
            onPress={openCenter}
            accessibilityLabel="Notifications"
          >
            <MaterialCommunityIcons
              name={unseenCount > 0 ? "bell-badge-outline" : "bell-outline"}
              size={24}
              color="#0F172A"
            />
            {unseenCount > 0 && (
              <View style={styles.notificationBadgePill}>
                <Text style={styles.notificationBadgeText}>
                  {unseenCount > 9 ? "9+" : unseenCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={styles.profileHeaderButton}
            onPress={() => router.push("/(app)/profile" as any)}
            accessibilityLabel="My Profile"
          >
            <MaterialCommunityIcons name="account-outline" size={26} color="#0F172A" />
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.container}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#0D3E02" />
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topOffset + 68,
            paddingBottom: Math.max(insets.bottom, 16) + 84,
          },
        ]}
      >
        {/* Good Morning & Syeda Zahra Ijaz Greeting */}
        <View style={styles.heroGreetingSection}>
          <Text style={styles.heroGreetingSub}>{greeting},</Text>
          <Text style={styles.heroGreetingName} numberOfLines={1}>
            {displayName}
          </Text>
        </View>

        {/* Global Search Bar (Placeholder: "Search...") */}
        <Pressable
          style={styles.searchBarContainer}
          onPress={() => { setServiceQuery(""); setServiceSearchOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
          <Text style={styles.searchPlaceholderText}>Search...</Text>
        </Pressable>

        {/* LGU Campus Photo Banner (Zero text overlay) */}
        <View style={styles.lguBannerContainer}>
          <Image
            source={LGU_CAMPUS_IMAGE}
            style={styles.lguBannerImage}
            resizeMode="cover"
          />
        </View>

        {/* Campus Services Section with Black Grid Lines */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Campus services</Text>
        </View>

        <View style={styles.servicesGridBox}>
          {/* Row 1 */}
          <View style={styles.servicesGridRow}>
            {/* 1. Tutoring */}
            <Pressable
              style={styles.gridCell}
              onPress={() => {
                router.push("/(app)/tutoring" as any);
                recordVisit("tutoring");
              }}
            >
              <MaterialCommunityIcons name="school-outline" size={26} color="#1E293B" />
              <Text style={styles.gridCellTitle}>Tutoring</Text>
            </Pressable>

            <View style={styles.verticalDivider} />

            {/* 2. Marketplace */}
            <Pressable
              style={styles.gridCell}
              onPress={() => {
                router.push("/(app)/resources" as any);
                recordVisit("marketplace");
              }}
            >
              <MaterialCommunityIcons name="storefront-outline" size={26} color="#1E293B" />
              <Text style={styles.gridCellTitle} numberOfLines={1}>Marketplace</Text>
            </Pressable>

            <View style={styles.verticalDivider} />

            {/* 3. Digital Library */}
            <Pressable
              style={styles.gridCell}
              onPress={handleDigitalLibraryPress}
            >
              <MaterialCommunityIcons name="book-open-variant" size={26} color="#1E293B" />
              <Text style={styles.gridCellTitle} numberOfLines={1}>Digital Library</Text>
            </Pressable>
          </View>

          {/* Horizontal Divider Line */}
          <View style={styles.horizontalDivider} />

          {/* Row 2 */}
          <View style={styles.servicesGridRow}>
            {/* 4. Lost & Found */}
            <Pressable
              style={styles.gridCell}
              onPress={() => {
                router.push("/(app)/lost-and-found" as any);
                recordVisit("lost_and_found");
              }}
            >
              <MaterialCommunityIcons name="magnify" size={26} color="#1E293B" />
              <Text style={styles.gridCellTitle}>Lost & Found</Text>
            </Pressable>

            <View style={styles.verticalDivider} />

            {/* 5. Ride Sharing */}
            <Pressable
              style={styles.gridCell}
              onPress={handleRideSharePress}
            >
              <MaterialCommunityIcons name="car-outline" size={26} color="#1E293B" />
              <Text style={styles.gridCellTitle}>Ride Sharing</Text>
            </Pressable>

            <View style={styles.verticalDivider} />

            {/* 6. Print Center */}
            <Pressable
              style={styles.gridCell}
              onPress={handlePrintCenterPress}
            >
              <MaterialCommunityIcons name="printer-outline" size={26} color="#1E293B" />
              <Text style={styles.gridCellTitle}>Print Center</Text>
            </Pressable>
          </View>
        </View>

        {/* Campus Highlights Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Campus Highlights</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#1E293B" />
        </View>

        <Pressable
          style={[styles.spotlightBannerCard, { width: cardWidth }]}
          onPress={() => setSelectedEventForModal(upcomingEvents[0] || null)}
        >
          <ImageBackground
            source={CARNIVAL_IMAGE}
            style={styles.spotlightBgImage}
            imageStyle={{ borderRadius: 16 }}
            resizeMode="cover"
          >
            <View style={styles.spotlightDarkGradientOverlay}>
              <View style={styles.spotlightContentContainer}>
                <View style={styles.spotlightWhitePill}>
                  <Text style={styles.spotlightWhitePillText}>Campus Spotlight</Text>
                </View>

                <Text style={styles.spotlightBannerTitle} numberOfLines={2}>
                  LGU Annual Winter Carnival
                </Text>

                <View style={styles.spotlightBannerMetaRow}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={13} color="#E2E8F0" style={{ marginRight: 5 }} />
                  <Text style={styles.spotlightBannerMetaText}>Nov 27, 2026 · 10:00 AM</Text>
                </View>

                <View style={styles.spotlightBannerMetaRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={13} color="#E2E8F0" style={{ marginRight: 5 }} />
                  <Text style={styles.spotlightBannerMetaText}>Main Campus Grounds</Text>
                </View>

                <View style={styles.spotlightViewDetailsPill}>
                  <Text style={styles.spotlightViewDetailsText}>View Details →</Text>
                </View>
              </View>

              <View style={styles.spotlightDotsRow}>
                <View style={[styles.spotlightDotIndicator, styles.spotlightDotIndicatorActive]} />
                <View style={styles.spotlightDotIndicator} />
                <View style={styles.spotlightDotIndicator} />
              </View>
            </View>
          </ImageBackground>
        </Pressable>

        {/* Your Activity Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Your Activity</Text>
          <Pressable onPress={openCenter} accessibilityLabel="View all activity notifications">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Text style={styles.sectionSeeAll}>View all</Text>
              <MaterialCommunityIcons name="arrow-right" size={13} color="#64748B" />
            </View>
          </Pressable>
        </View>

        <View style={styles.activityCardContainer}>
          {/* Row 1: Tutoring sessions */}
          <Pressable
            style={styles.activityRowItem}
            onPress={() => router.push("/(app)/tutoring" as any)}
          >
            <MaterialCommunityIcons name="school-outline" size={22} color="#1E293B" style={{ marginRight: 14 }} />
            <View style={styles.activityRowInfo}>
              <Text style={styles.activityRowTitle}>Tutoring sessions</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </Pressable>

          <View style={styles.activityDivider} />

          {/* Row 2: Marketplace listings */}
          <Pressable
            style={styles.activityRowItem}
            onPress={() => router.push("/(app)/resources" as any)}
          >
            <MaterialCommunityIcons name="storefront-outline" size={22} color="#1E293B" style={{ marginRight: 14 }} />
            <View style={styles.activityRowInfo}>
              <Text style={styles.activityRowTitle}>Marketplace listings</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Recommended for you Section (Real student photo, no AI pics) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Recommended for you</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendHorizontalScroll}>
          <Pressable
            style={styles.recommendedCard}
            onPress={() => router.push("/(app)/resources" as any)}
          >
            <Image
              source={STUDENTS_STUDY_IMAGE}
              style={styles.recommendedImage}
              resizeMode="cover"
            />
            <View style={styles.recommendedContent}>
              <Text style={styles.recommendedTitle} numberOfLines={2}>
                Explore student resources
              </Text>
              <Text style={styles.recommendedSub}>Marketplace</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
          </Pressable>

          <Pressable
            style={styles.recommendedCard}
            onPress={() => router.push("/(app)/tutoring" as any)}
          >
            <Image
              source={LGU_BUILDING_IMAGE}
              style={styles.recommendedImage}
              resizeMode="cover"
            />
            <View style={styles.recommendedContent}>
              <Text style={styles.recommendedTitle} numberOfLines={2}>
                Connect with peer tutors
              </Text>
              <Text style={styles.recommendedSub}>Tutoring</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
          </Pressable>
        </ScrollView>
      </ScrollView>

      {/* Search Modal */}
      <Modal visible={serviceSearchOpen} transparent animationType="fade" onRequestClose={() => setServiceSearchOpen(false)}>
        <View style={styles.searchModalBackdrop}>
          <View style={styles.searchModalCard}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.sectionHeading}>Campus services</Text>
              <Pressable accessibilityLabel="Close search" hitSlop={10} onPress={() => setServiceSearchOpen(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#0F172A" />
              </Pressable>
            </View>
            <View style={styles.searchModalInputRow}>
              <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchModalInput}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                autoFocus
                value={serviceQuery}
                onChangeText={setServiceQuery}
              />
              {serviceQuery.length > 0 && (
                <Pressable onPress={() => setServiceQuery("")}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                </Pressable>
              )}
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {searchableServices.map(item => (
                <Pressable
                  key={item.label}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setServiceSearchOpen(false);
                    router.push(item.route as any);
                  }}
                >
                  <MaterialCommunityIcons name={item.icon} size={22} color="#1E293B" style={{ marginRight: 12 }} />
                  <Text style={styles.searchResultText}>{item.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Event Details Modal */}
      {selectedEventForModal && (
        <Modal
          visible={!!selectedEventForModal}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedEventForModal(null)}
        >
          <View style={styles.eventModalBackdrop}>
            <View style={styles.eventModalCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={styles.eventModalPill}>
                  <Text style={styles.eventModalPillText}>{selectedEventForModal.tag}</Text>
                </View>
                <Pressable onPress={() => setSelectedEventForModal(null)} hitSlop={10}>
                  <MaterialCommunityIcons name="close" size={22} color="#64748B" />
                </Pressable>
              </View>

              <Text style={styles.eventModalTitle}>{selectedEventForModal.title}</Text>

              <View style={{ gap: 6, marginVertical: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={15} color="#0D3E02" style={{ marginRight: 6 }} />
                  <Text style={styles.eventModalMeta}>{selectedEventForModal.dateTime}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="map-marker-outline" size={15} color="#0D3E02" style={{ marginRight: 6 }} />
                  <Text style={styles.eventModalMeta}>{selectedEventForModal.venue}</Text>
                </View>
              </View>

              <Text style={styles.eventModalDesc}>{selectedEventForModal.description}</Text>

              <Pressable
                style={styles.eventModalCtaBtn}
                onPress={() => setSelectedEventForModal(null)}
              >
                <Text style={styles.eventModalCtaText}>Got It</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },

  // Top Bar
  collapsibleTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topNavLeft: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    gap: 8,
  },
  brandTitleWrap: {
    justifyContent: "center",
  },
  topNavBrand: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  universityLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#64748B",
    marginTop: 1,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationHeaderButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadgePill: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  notificationBadgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "900",
    textAlign: "center",
  },
  profileHeaderButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },

  // Hero Greeting Section
  heroGreetingSection: {
    paddingTop: 8,
    paddingBottom: 14,
  },
  heroGreetingSub: {
    fontSize: 15,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 2,
  },
  heroGreetingName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.4,
  },

  // Global Search Bar
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchPlaceholderText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#94A3B8",
  },

  // LGU Campus Banner (Photo only)
  lguBannerContainer: {
    width: "100%",
    height: 165,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 22,
    backgroundColor: "#F1F5F9",
  },
  lguBannerImage: {
    width: "100%",
    height: "100%",
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSeeAll: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  // Campus Services Grid with Lines
  servicesGridBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginBottom: 24,
  },
  servicesGridRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridCell: {
    flex: 1,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  gridCellTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 6,
    textAlign: "center",
  },
  verticalDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#E2E8F0",
  },
  horizontalDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  // Campus Spotlight Carousel
  spotlightBannerCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  spotlightBgImage: {
    width: "100%",
    height: 195,
  },
  spotlightDarkGradientOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    padding: 16,
    justifyContent: "space-between",
    borderRadius: 16,
  },
  spotlightContentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  spotlightWhitePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  spotlightWhitePillText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  spotlightBannerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.3,
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  spotlightBannerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  spotlightBannerMetaText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E2E8F0",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  spotlightViewDetailsPill: {
    marginTop: 8,
  },
  spotlightViewDetailsText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  spotlightDotsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 5,
  },
  spotlightDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  spotlightDotIndicatorActive: {
    backgroundColor: "#ffffff",
    width: 14,
    borderRadius: 3,
  },

  // Your Activity Section
  activityCardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
  },
  activityRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  activityRowInfo: {
    flex: 1,
  },
  activityRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  activityDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Recommended for you
  recommendHorizontalScroll: {
    paddingBottom: 8,
    gap: 12,
  },
  recommendedCard: {
    width: 290,
    height: 84,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  recommendedImage: {
    width: 95,
    height: "100%",
  },
  recommendedContent: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  recommendedTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 18,
  },
  recommendedSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 3,
  },

  // Modals
  searchModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  searchModalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  searchModalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchModalInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    padding: 0,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  eventModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  eventModalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  eventModalPill: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventModalPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D3E02",
  },
  eventModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  eventModalMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  eventModalDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
  },
  eventModalCtaBtn: {
    backgroundColor: "#0D3E02",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  eventModalCtaText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
'''

path = r"mobile/src/features/home/presentation/HomeScreen.tsx"
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Overwrote HomeScreen.tsx to match preview pixel-perfect!")
