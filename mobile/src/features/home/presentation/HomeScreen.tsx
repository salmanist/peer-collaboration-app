import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
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
    id: "evt-tech-talk",
    tag: "Campus Spotlight",
    icon: "laptop-account",
    title: "Tech Talk: Building Scalable Systems",
    eventDate: "2026-10-10T11:00:00",
    dateTime: "Oct 10, 2026 • 11:00 AM",
    venue: "LGU Auditorium",
    description: "Join industry leaders as they share architecture principles for engineering ultra-high-throughput systems and resilient microservices. Open to all students.",
    ctaText: "View Details",
  },
  {
    id: "evt-carnival",
    tag: "Campus Spotlight",
    icon: "party-popper",
    title: "LGU Annual Winter Carnival & Food Fiesta 2026",
    eventDate: "2026-11-27T10:00:00",
    dateTime: "Nov 27, 2026 • 10:00 AM",
    venue: "Main Campus Grounds",
    description: "The biggest annual winter festival is coming! Enjoy 30+ student food stalls, live acoustic music stage, e-gaming tournament, and startup showcases.",
    ctaText: "View Details",
  },
  {
    id: "evt-mids",
    tag: "Academic Spotlight",
    icon: "file-document-edit-outline",
    title: "Fall 2026 Midterm Date Sheet & Hall Guidelines",
    eventDate: "2026-11-09T08:30:00",
    dateTime: "Nov 09, 2026 • 08:30 AM",
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

  const upcomingEvents = ALL_CAMPUS_EVENTS;
  const cardWidth = Math.max(width - 32, 280);

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

  // Data Store for Live Previews
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
    } catch {
      // Gracefully ignore background load errors
    }
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
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  if (!user) return null;

  const displayName = user.full_name || user.display_name || "Syeda Zahra Ijaz";

  const handleRideSharePress = () => router.push("/(app)/rides" as any);
  const handlePrintCenterPress = () => router.push("/(app)/printing" as any);
  const handleDigitalLibraryPress = () => router.push("/(app)/library" as any);

  return (
    <View style={styles.rootContainer}>
      {/* Sleek Top Navigation Bar without Left Logo */}
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
          <Text style={styles.topNavBrand}>FELLOo</Text>
        </View>

        <View style={styles.topRightActions}>
          <Pressable
            style={styles.notificationHeaderButton}
            onPress={openCenter}
            accessibilityLabel="Notifications"
          >
            <MaterialCommunityIcons
              name={unseenCount > 0 ? "bell-badge-outline" : "bell-outline"}
              size={23}
              color="#0D3E02"
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
            <MaterialCommunityIcons name="account-circle-outline" size={26} color="#0D3E02" />
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
        {/* Breathing Hero Greeting Section */}
        <View style={styles.heroGreetingSection}>
          {/* "Good Morning," in bold BLACK color */}
          <Text style={styles.heroGreetingSub}>{greeting},</Text>
          {/* User Name in rich Emerald Green */}
          <Text style={styles.heroGreetingName} numberOfLines={1}>
            {displayName}
          </Text>
        </View>

        {/* Global Search Bar */}
        <Pressable
          style={styles.searchBarContainer}
          onPress={() => router.push("/(app)/resources" as any)}
        >
          <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" style={{ marginRight: 8 }} />
          <Text style={styles.searchPlaceholderText}>
            Search tutors, resources, lost & found...
          </Text>
        </Pressable>

        {/* Quick Action Chips Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsContainer}
        >
          <Pressable
            style={styles.quickActionChip}
            onPress={() => router.push("/(app)/resources/create" as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: "#FEF3C7" }]}>
              <MaterialCommunityIcons name="plus-box" size={16} color="#D97706" />
            </View>
            <Text style={styles.quickActionText}>Share Item</Text>
          </Pressable>

          <Pressable
            style={styles.quickActionChip}
            onPress={() => router.push("/(app)/lost-and-found/create" as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: "#D1FAE5" }]}>
              <MaterialCommunityIcons name="map-marker-plus" size={16} color="#059669" />
            </View>
            <Text style={styles.quickActionText}>Report Notice</Text>
          </Pressable>

          <Pressable
            style={styles.quickActionChip}
            onPress={() => router.push("/(app)/tutoring" as any)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: "#DCFCE7" }]}>
              <MaterialCommunityIcons name="account-search" size={16} color="#166534" />
            </View>
            <Text style={styles.quickActionText}>Find Tutor</Text>
          </Pressable>

          <Pressable
            style={styles.quickActionChip}
            onPress={handleRideSharePress}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: "#FCE7F3" }]}>
              <MaterialCommunityIcons name="car-multiple" size={16} color="#DB2777" />
            </View>
            <Text style={styles.quickActionText}>Ride Share</Text>
          </Pressable>
        </ScrollView>

        {/* Live Notice Banner (if any) */}
        {(pendingTutoringRequests > 0 || hasNewLostClaims || hasNewResources) && (
          <View style={styles.alertNotice}>
            <MaterialCommunityIcons name="bell-ring-outline" size={18} color="#B45309" />
            <Text style={styles.alertNoticeText} numberOfLines={2}>
              {pendingTutoringRequests > 0 ? `${pendingTutoringRequests} session request(s) waiting. ` : ""}
              {hasNewLostClaims ? "New claim updates on lost notices. " : ""}
              {hasNewResources ? "Fresh student ads posted." : ""}
            </Text>
          </View>
        )}

        {/* Campus Services Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Campus Services</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topServicesHorizontalScroll}
        >
          {/* 1. Tutoring */}
          <Pressable
            style={styles.topServiceCard}
            onPress={() => {
              router.push("/(app)/tutoring" as any);
              recordVisit("tutoring");
            }}
          >
            <View style={[styles.serviceBoxIconWrapper, { backgroundColor: "#F3E8FF" }]}>
              <MaterialCommunityIcons name="school" size={24} color="#7C3AED" />
              <View style={styles.serviceBoxBadge}>
                <Text style={styles.serviceBoxBadgeText}>{pendingTutoringRequests > 0 ? pendingTutoringRequests : "2"}</Text>
              </View>
            </View>
            <Text style={styles.topServiceTitle}>Tutoring</Text>
            <Text style={styles.topServiceSub}>
              {pendingTutoringRequests > 0 ? `${pendingTutoringRequests} new requests` : "2 new requests"}
            </Text>
          </Pressable>

          {/* 2. Resources */}
          <Pressable
            style={styles.topServiceCard}
            onPress={() => {
              router.push("/(app)/resources" as any);
              recordVisit("marketplace");
            }}
          >
            <View style={[styles.serviceBoxIconWrapper, { backgroundColor: "#DCFCE7" }]}>
              <MaterialCommunityIcons name="book-open-page-variant" size={24} color="#16A34A" />
              <View style={styles.serviceBoxBadge}>
                <Text style={styles.serviceBoxBadgeText}>{(resourceListings?.length && resourceListings.length > 0) ? resourceListings.length : "4"}</Text>
              </View>
            </View>
            <Text style={styles.topServiceTitle}>Resources</Text>
            <Text style={styles.topServiceSub}>
              {(resourceListings?.length && resourceListings.length > 0) ? `${resourceListings.length} new listings` : "4 new listings"}
            </Text>
          </Pressable>

          {/* 3. Digital Library */}
          <Pressable
            style={styles.topServiceCard}
            onPress={handleDigitalLibraryPress}
          >
            <View style={[styles.serviceBoxIconWrapper, { backgroundColor: "#E0F2FE" }]}>
              <MaterialCommunityIcons name="bookshelf" size={24} color="#0284C7" />
            </View>
            <Text style={styles.topServiceTitle}>Digital Library</Text>
            <Text style={styles.topServiceSub}>Past papers & notes</Text>
          </Pressable>

          {/* 4. Lost & Found */}
          <Pressable
            style={styles.topServiceCard}
            onPress={() => {
              router.push("/(app)/lost-and-found" as any);
              recordVisit("lost_and_found");
            }}
          >
            <View style={[styles.serviceBoxIconWrapper, { backgroundColor: "#FEF9C3" }]}>
              <MaterialCommunityIcons name="magnify" size={24} color="#D97706" />
            </View>
            <Text style={styles.topServiceTitle}>Lost & Found</Text>
            <Text style={styles.topServiceSub}>1 new claim</Text>
          </Pressable>

          {/* 5. Ride Share */}
          <Pressable
            style={styles.topServiceCard}
            onPress={handleRideSharePress}
          >
            <View style={[styles.serviceBoxIconWrapper, { backgroundColor: "#DBEAFE" }]}>
              <MaterialCommunityIcons name="car" size={24} color="#2563EB" />
              <View style={styles.serviceBoxBadge}>
                <Text style={styles.serviceBoxBadgeText}>1</Text>
              </View>
            </View>
            <Text style={styles.topServiceTitle}>Ride Share</Text>
            <Text style={styles.topServiceSub}>1 new ride</Text>
          </Pressable>

          {/* 6. Print Center */}
          <Pressable
            style={styles.topServiceCard}
            onPress={handlePrintCenterPress}
          >
            <View style={[styles.serviceBoxIconWrapper, { backgroundColor: "#FFE4E6" }]}>
              <MaterialCommunityIcons name="printer" size={24} color="#E11D48" />
            </View>
            <Text style={styles.topServiceTitle}>Print Center</Text>
            <Text style={styles.topServiceSub}>1 new request</Text>
          </Pressable>
        </ScrollView>

        {/* Swipeable Campus Spotlight Banner Carousel */}
        {upcomingEvents.length > 0 && (
          <View style={styles.spotlightCarouselWrapper}>
            <ScrollView
              ref={spotlightScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={cardWidth + 12}
              snapToAlignment="center"
              contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
              onScroll={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const idx = Math.round(offsetX / (cardWidth + 12));
                if (idx !== currentEventIndex && idx >= 0 && idx < upcomingEvents.length) {
                  setCurrentEventIndex(idx);
                }
              }}
              scrollEventThrottle={16}
            >
              {upcomingEvents.map((evt, idx) => (
                <Pressable
                  key={evt.id}
                  style={[styles.spotlightBannerCard, { width: cardWidth }]}
                  onPress={() => setSelectedEventForModal(evt)}
                >
                  <ImageBackground
                    source={LGU_CAMPUS_IMAGE}
                    style={styles.spotlightBgImage}
                    imageStyle={{ borderRadius: 20 }}
                  >
                    <View style={styles.spotlightDarkGradientOverlay}>
                      <View style={styles.spotlightContentContainer}>
                        {/* Top Pill */}
                        <View style={styles.spotlightWhitePill}>
                          <Text style={styles.spotlightWhitePillText}>{evt.tag}</Text>
                        </View>

                        {/* Event Title */}
                        <Text style={styles.spotlightBannerTitle} numberOfLines={2}>
                          {evt.title}
                        </Text>

                        {/* Meta 1: Date/Time */}
                        <View style={styles.spotlightBannerMetaRow}>
                          <MaterialCommunityIcons name="calendar-month-outline" size={13} color="#E2E8F0" style={{ marginRight: 5 }} />
                          <Text style={styles.spotlightBannerMetaText}>{evt.dateTime}</Text>
                        </View>

                        {/* Meta 2: Location */}
                        <View style={styles.spotlightBannerMetaRow}>
                          <MaterialCommunityIcons name="map-marker-outline" size={13} color="#E2E8F0" style={{ marginRight: 5 }} />
                          <Text style={styles.spotlightBannerMetaText}>{evt.venue}</Text>
                        </View>

                        {/* View Details Pill Button */}
                        <View style={styles.spotlightViewDetailsPill}>
                          <Text style={styles.spotlightViewDetailsText}>View Details ➔</Text>
                        </View>
                      </View>

                      {/* Pagination Dots at bottom right */}
                      <View style={styles.spotlightDotsRow}>
                        {upcomingEvents.map((_, dotIdx) => (
                          <Pressable
                            key={dotIdx}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              spotlightScrollRef.current?.scrollTo({
                                x: dotIdx * (cardWidth + 12),
                                animated: true,
                              });
                              setCurrentEventIndex(dotIdx);
                            }}
                            style={[
                              styles.spotlightDotIndicator,
                              currentEventIndex === dotIdx && styles.spotlightDotIndicatorActive,
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  </ImageBackground>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Your Activity Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Your Activity</Text>
          <Pressable onPress={() => router.push("/(app)/profile" as any)}>
            <Text style={styles.sectionSeeAll}>View All ➔</Text>
          </Pressable>
        </View>

        <View style={styles.activityCardContainer}>
          {/* Row 1: Tutoring */}
          <Pressable
            style={styles.activityRowItem}
            onPress={() => router.push("/(app)/tutoring" as any)}
          >
            <View style={[styles.activityRowIconBox, { backgroundColor: "#F3E8FF" }]}>
              <MaterialCommunityIcons name="school" size={20} color="#7C3AED" />
            </View>
            <View style={styles.activityRowInfo}>
              <Text style={styles.activityRowTitle}>Tutoring</Text>
              <Text style={styles.activityRowSub}>2 requests pending</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </Pressable>

          <View style={styles.activityDivider} />

          {/* Row 2: Marketplace */}
          <Pressable
            style={styles.activityRowItem}
            onPress={() => router.push("/(app)/resources" as any)}
          >
            <View style={[styles.activityRowIconBox, { backgroundColor: "#DCFCE7" }]}>
              <MaterialCommunityIcons name="book-open-page-variant" size={20} color="#16A34A" />
            </View>
            <View style={styles.activityRowInfo}>
              <Text style={styles.activityRowTitle}>Marketplace</Text>
              <Text style={styles.activityRowSub}>Your listing has 4 views</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </Pressable>

          <View style={styles.activityDivider} />

          {/* Row 3: Lost & Found */}
          <Pressable
            style={styles.activityRowItem}
            onPress={() => router.push("/(app)/lost-and-found" as any)}
          >
            <View style={[styles.activityRowIconBox, { backgroundColor: "#FEF9C3" }]}>
              <MaterialCommunityIcons name="magnify" size={20} color="#D97706" />
            </View>
            <View style={styles.activityRowInfo}>
              <Text style={styles.activityRowTitle}>Lost & Found</Text>
              <Text style={styles.activityRowSub}>Claim request accepted</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </Pressable>

          <View style={styles.activityDivider} />

          {/* Row 4: Ride Share */}
          <Pressable
            style={styles.activityRowItem}
            onPress={handleRideSharePress}
          >
            <View style={[styles.activityRowIconBox, { backgroundColor: "#DBEAFE" }]}>
              <MaterialCommunityIcons name="car" size={20} color="#2563EB" />
            </View>
            <View style={styles.activityRowInfo}>
              <Text style={styles.activityRowTitle}>Ride Share</Text>
              <Text style={styles.activityRowSub}>Upcoming ride tomorrow</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Recommended for You Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Recommended for You</Text>
          <Pressable onPress={() => router.push("/(app)/resources" as any)}>
            <Text style={styles.sectionSeeAll}>View All ➔</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendHorizontalScroll}
        >
          {/* 1. Tutoring Recommendation */}
          <Pressable
            style={styles.recommendCard}
            onPress={() => router.push("/(app)/tutoring" as any)}
          >
            <View style={[styles.recommendTagBadge, { backgroundColor: "#F3E8FF" }]}>
              <Text style={[styles.recommendTagText, { color: "#7C3AED" }]}>Tutoring</Text>
            </View>
            <View style={styles.recommendAvatarBox}>
              <MaterialCommunityIcons name="account-circle" size={42} color="#0D3E02" />
            </View>
            <Text style={styles.recommendCardTitle} numberOfLines={1}>Calculus Tutor</Text>
            <Text style={styles.recommendCardSub} numberOfLines={1}>Sarah Ahmed</Text>
            <Text style={styles.recommendCardPrice}>⭐ 4.9 (32) • Rs. 800/hr</Text>
          </Pressable>

          {/* 2. Marketplace Recommendation */}
          <Pressable
            style={styles.recommendCard}
            onPress={() => router.push("/(app)/resources" as any)}
          >
            <View style={[styles.recommendTagBadge, { backgroundColor: "#DCFCE7" }]}>
              <Text style={[styles.recommendTagText, { color: "#16A34A" }]}>Marketplace</Text>
            </View>
            <View style={styles.recommendAvatarBox}>
              <MaterialCommunityIcons name="calculator-variant" size={38} color="#0D3E02" />
            </View>
            <Text style={styles.recommendCardTitle} numberOfLines={1}>Scientific Calculator</Text>
            <Text style={styles.recommendCardSub} numberOfLines={1}>Casio fx-991EX</Text>
            <Text style={styles.recommendCardPrice}>Rs. 2,500</Text>
          </Pressable>

          {/* 3. Ride Share Recommendation */}
          <Pressable
            style={styles.recommendCard}
            onPress={handleRideSharePress}
          >
            <View style={[styles.recommendTagBadge, { backgroundColor: "#DBEAFE" }]}>
              <Text style={[styles.recommendTagText, { color: "#2563EB" }]}>Ride Share</Text>
            </View>
            <View style={styles.recommendAvatarBox}>
              <MaterialCommunityIcons name="car-sports" size={38} color="#2563EB" />
            </View>
            <Text style={styles.recommendCardTitle} numberOfLines={1}>Johar Town ➔ Campus</Text>
            <Text style={styles.recommendCardSub} numberOfLines={1}>Tomorrow • 8:00 AM</Text>
            <Text style={styles.recommendCardPrice}>Rs. 150</Text>
          </Pressable>

          {/* 4. Lost & Found Recommendation */}
          <Pressable
            style={styles.recommendCard}
            onPress={() => router.push("/(app)/lost-and-found" as any)}
          >
            <View style={[styles.recommendTagBadge, { backgroundColor: "#FFE4E6" }]}>
              <Text style={[styles.recommendTagText, { color: "#E11D48" }]}>Lost & Found</Text>
            </View>
            <View style={styles.recommendAvatarBox}>
              <MaterialCommunityIcons name="headphones" size={38} color="#E11D48" />
            </View>
            <Text style={styles.recommendCardTitle} numberOfLines={1}>iPhone / AirPods Found</Text>
            <Text style={styles.recommendCardSub} numberOfLines={1}>Near Library</Text>
            <Text style={styles.recommendCardPrice}>2 hours ago</Text>
          </Pressable>
        </ScrollView>
      </ScrollView>

      {/* Campus Event Modal */}
      {selectedEventForModal && (
        <Modal
          visible={Boolean(selectedEventForModal)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedEventForModal(null)}
        >
          <View style={styles.eventModalOverlay}>
            <View style={styles.eventModalCard}>
              <View style={styles.eventModalHeader}>
                <View style={styles.eventModalTagBadge}>
                  <Text style={styles.eventModalTagText}>{selectedEventForModal.tag}</Text>
                </View>
                <Pressable
                  style={styles.eventModalCloseBtn}
                  onPress={() => setSelectedEventForModal(null)}
                >
                  <MaterialCommunityIcons name="close" size={18} color="#64748B" />
                </Pressable>
              </View>

              <Text style={styles.eventModalTitle}>{selectedEventForModal.title}</Text>

              <View style={styles.eventModalMetaRow}>
                <MaterialCommunityIcons name="calendar-clock" size={15} color="#0D3E02" style={{ marginRight: 6 }} />
                <Text style={styles.eventModalMetaText}>{selectedEventForModal.dateTime}</Text>
              </View>

              <View style={styles.eventModalMetaRow}>
                <MaterialCommunityIcons name="map-marker" size={15} color="#0D3E02" style={{ marginRight: 6 }} />
                <Text style={styles.eventModalMetaText}>{selectedEventForModal.venue}</Text>
              </View>

              <View style={styles.eventModalDescBox}>
                <Text style={styles.eventModalDescText}>{selectedEventForModal.description}</Text>
              </View>

              <Pressable
                style={styles.eventModalDismissBtn}
                onPress={() => setSelectedEventForModal(null)}
              >
                <Text style={styles.eventModalDismissBtnText}>Got it</Text>
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
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },

  // Top Bar
  collapsibleTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topNavLeft: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
  },
  topNavBrand: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.4,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    paddingTop: 6,
    paddingBottom: 12,
  },
  heroGreetingSub: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A", // Black text
    marginBottom: 2,
  },
  heroGreetingName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0D3E02", // Dark green text
    letterSpacing: -0.4,
  },

  // Global Search Bar
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchPlaceholderText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#94A3B8",
  },

  // Quick Action Chips
  quickActionsContainer: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 14,
  },
  quickActionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Alert Notice Banner
  alertNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 14,
    gap: 10,
  },
  alertNoticeText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSeeAll: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D3E02",
  },

  // Top Services Row
  topServicesHorizontalScroll: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 16,
  },
  topServiceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    width: 90,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  serviceBoxIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  serviceBoxBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  serviceBoxBadgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "900",
  },
  topServiceTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 2,
  },
  topServiceSub: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
  },

  // Campus Spotlight Carousel
  spotlightCarouselWrapper: {
    marginBottom: 18,
  },
  spotlightBannerCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  spotlightBgImage: {
    width: "100%",
    minHeight: 175,
    justifyContent: "center",
  },
  spotlightDarkGradientOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 48, 8, 0.78)", // Dark Forest Green Overlay highlighting LGU
    padding: 16,
    borderRadius: 20,
    justifyContent: "space-between",
  },
  spotlightContentContainer: {
    maxWidth: "80%",
  },
  spotlightWhitePill: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  spotlightWhitePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D3E02",
  },
  spotlightBannerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 20,
    marginBottom: 6,
  },
  spotlightBannerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  spotlightBannerMetaText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.95)",
  },
  spotlightViewDetailsPill: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  spotlightViewDetailsText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D3E02",
  },
  spotlightDotsRow: {
    position: "absolute",
    bottom: 14,
    right: 14,
    flexDirection: "row",
    gap: 6,
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
  },

  // Your Activity List Card
  activityCardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  activityRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  activityRowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityRowInfo: {
    flex: 1,
  },
  activityRowTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 1,
  },
  activityRowSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  activityDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Recommended for You Cards
  recommendHorizontalScroll: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 20,
  },
  recommendCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    width: 145,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    alignItems: "center",
  },
  recommendTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  recommendTagText: {
    fontSize: 9,
    fontWeight: "800",
  },
  recommendAvatarBox: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
  },
  recommendCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginTop: 2,
  },
  recommendCardSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    marginBottom: 6,
  },
  recommendCardPrice: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D3E02",
    textAlign: "center",
  },

  // Modal
  eventModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  eventModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  eventModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  eventModalTagBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventModalTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
  },
  eventModalCloseBtn: {
    padding: 4,
  },
  eventModalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 12,
    lineHeight: 22,
  },
  eventModalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  eventModalMetaText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  eventModalDescBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  eventModalDescText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
  },
  eventModalDismissBtn: {
    backgroundColor: "#0D3E02",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  eventModalDismissBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
