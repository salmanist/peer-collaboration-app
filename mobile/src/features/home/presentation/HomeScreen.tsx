import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
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
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { fetchParticipation, selectActivityModules, Participation, ACTIVITY_MODULES } from "../activity";
import { getRecommendations } from "../recommendations";
import { useModuleUsageStore } from "../../../core/store/useModuleUsageStore";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { useResourceNotificationStore } from "../../resources/resourceNotifications";
import { useLostAndFoundNotificationStore } from "../../lost_and_found/lostAndFoundNotifications";
import { useTutoringNotificationStore } from "../../tutoring/tutoringNotifications";
import { useCampusNotificationStore } from "../../notifications/useCampusNotificationStore";
import { fetchResourceListings } from "../../resources/data/resourcesApi";
import { fetchTutors } from "../../tutoring/data/tutoringApi";
import { fetchLostAndFoundItems } from "../../lost_and_found/data/lostAndFoundApi";

const LGU_BANNER_IMAGE = require("../../../../assets/lgu_preview_clean.png");
// Campus Highlights backgrounds: one sharp image per card (the old ones were a 137px thumbnail, a letterboxed
// photo and a screenshot with text baked in). Swap in real event photos here when available.
const CARNIVAL_IMAGE = require("../../../../assets/event_carnival.jpg");
const TECH_TALK_IMAGE = require("../../../../assets/lgu_preview_clean.png");
const MIDTERMS_IMAGE = require("../../../../assets/lgu_campus.png");

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
  const [showAllActivity, setShowAllActivity] = useState(false);

  const upcomingEvents = ALL_CAMPUS_EVENTS;
  const cardWidth = Math.max(width - 40, 250);

  const [selectedEventForModal, setSelectedEventForModal] = useState<CampusSpotlightEvent | null>(null);

  const user = useSessionStore((state) => state.user);
  const accessToken = useSessionStore((state) => state.accessToken);
  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const { headerTranslateY, handleScroll } = useCollapsibleHeader(topOffset + 34 + 2 * headerGrow);

  const pendingTutoringRequests = useTutoringNotificationStore((state) => state.pendingRequestsCount);
  const hasNewLostClaims = useLostAndFoundNotificationStore((state) => state.hasNewClaims);
  const hasNewResources = useResourceNotificationStore((state) => state.hasNewResources);

  const [participationState, setParticipationState] = useState<{ userId: number; data: Participation } | null>(null);
  useFocusEffect(useCallback(() => {
    let mounted = true;
    if (user?.id) void fetchParticipation().then(data => {
      if (mounted) setParticipationState({ userId: user.id, data });
    });
    return () => { mounted = false; };
  }, [user?.id]));
  const visitCounts = useModuleUsageStore((state) => state.visitCounts);
  const lastVisited = useModuleUsageStore((state) => state.lastVisited);
  const notifications = useCampusNotificationStore((state) => state.notifications);
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

  const recommendations = useMemo(() => getRecommendations(
    resourceListings || [], tutors || [], user?.skills || [], visitCounts, lastVisited, user?.id || 0,
  ), [resourceListings, tutors, user?.skills, user?.id, visitCounts, lastVisited]);
  const moduleNotice = (module: string) => {
    const aliases: Record<string, string[]> = { tutoring: ["sessions", "tutoring"], resources: ["marketplace", "resources"], library: ["library"], "lost-and-found": ["lost_and_found", "lost-and-found"], rides: ["rides", "ride_sharing", "ondemand"], printing: ["printing"] };
    const count = notifications.filter(n => !n.is_read && n.is_active && (aliases[module]?.includes(n.category) || (n.action_url || "").includes(`/${module}`))).length;
    return count ? <View style={styles.moduleNotice}><MaterialCommunityIcons name="bell-outline" size={10} color={appColors.neutral500} /><Text style={styles.moduleNoticeText}>{count} {count === 1 ? "notice" : "notices"}</Text></View> : null;
  };

  const activityModules = useMemo(() => {
    const active = selectActivityModules(
      visitCounts,
      lastVisited,
      participationState?.userId === user?.id ? participationState?.data || {} : {},
    );
    const activeIds = new Set(active.map((m) => m.id));
    const remaining = (ACTIVITY_MODULES as readonly (typeof ACTIVITY_MODULES[number])[]).filter(
      (m) => !activeIds.has(m.id),
    );
    return [...active, ...remaining];
  }, [visitCounts, lastVisited, participationState, user?.id]);

  if (!user) return null;

  const displayName = user.full_name || user.display_name || "Syeda Zahra Ijaz";

  const handleRideSharePress = () => router.push("/(app)/rides" as any);
  const handlePrintCenterPress = () => router.push("/(app)/printing" as any);
  const handleDigitalLibraryPress = () => router.push("/(app)/library" as any);

  const handleNextSpotlight = () => {
    const nextIdx = (currentEventIndex + 1) % upcomingEvents.length;
    spotlightScrollRef.current?.scrollTo({ x: nextIdx * (cardWidth + 12), animated: true });
    setCurrentEventIndex(nextIdx);
  };

  const handleDotPress = (dotIdx: number) => {
    spotlightScrollRef.current?.scrollTo({ x: dotIdx * (cardWidth + 12), animated: true });
    setCurrentEventIndex(dotIdx);
  };

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
      <StatusBar barStyle="light-content" backgroundColor={appColors.primary} />

      {/* Top Header Bar matching Preview */}
      <Animated.View
        style={[
          styles.collapsibleTopBar,
          {
            paddingTop: (topOffset > 0 ? topOffset : 4) + 4,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={styles.topNavLeft}>
          <FelloLogo size={20} variant="yellow" />
          <View style={styles.brandTitleWrap}>
            <Text style={styles.topNavBrand}>Fello</Text>
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
              size={22}
              color={appColors.white}
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
            <MaterialCommunityIcons name="account-outline" size={22} color={appColors.onHeader} />
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={appColors.primary} />
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topOffset + 48 + 2 * headerGrow,
            paddingBottom: Math.max(insets.bottom, 16) + 84,
          },
        ]}
      >
        {/* Good Morning & Syeda Zahra Ijaz Greeting */}
        <View style={styles.heroGreetingSection}>
          <View style={styles.heroGreetingText}>
            <Text style={styles.heroGreetingSub}>{greeting},</Text>
            <Text style={styles.heroGreetingName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
          <Pressable
            style={styles.askButton}
            onPress={() => router.push("/(app)/chatbot" as any)}
            accessibilityRole="button"
            accessibilityLabel="Ask the University Assistant"
          >
            <MaterialCommunityIcons name="robot-outline" size={18} color={appColors.primary} />
            <Text style={styles.askButtonText}>Ask me</Text>
          </Pressable>
        </View>

        {/* Global Search Bar Under Name */}
        <Pressable
          style={styles.searchBarContainer}
          onPress={() => { setServiceQuery(""); setServiceSearchOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <MaterialCommunityIcons name="magnify" size={20} color={appColors.slate400} style={{ marginRight: 8 }} />
          <Text style={styles.searchPlaceholderText}>Search...</Text>
        </Pressable>

        {/* LGU Campus Photo Banner (Zero text overlay) */}
        <View style={styles.lguBannerContainer}>
          <Image
            source={LGU_BANNER_IMAGE}
            style={styles.lguBannerImage}
            resizeMode="contain"
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
              }}
            >
              <MaterialCommunityIcons name="school-outline" size={28} color={appColors.icon} />
              <Text style={styles.gridCellTitle}>Tutoring</Text>
            </Pressable>

            <View style={styles.verticalDivider} />

            {/* 2. Marketplace */}
            <Pressable
              style={styles.gridCell}
              onPress={() => {
                router.push("/(app)/resources" as any);
              }}
            >
              <MaterialCommunityIcons name="storefront-outline" size={28} color={appColors.icon} />
              <Text style={styles.gridCellTitle} numberOfLines={1}>Marketplace</Text>
            </Pressable>

            <View style={styles.verticalDivider} />

            {/* 3. Digital Library */}
            <Pressable
              style={styles.gridCell}
              onPress={handleDigitalLibraryPress}
            >
              <MaterialCommunityIcons name="bookshelf" size={28} color={appColors.icon} />
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
              }}
            >
              <MaterialCommunityIcons name="magnify" size={28} color={appColors.icon} />
              <Text style={styles.gridCellTitle}>Lost & Found</Text>
            </Pressable>

            <View style={styles.verticalDivider} />

            {/* 5. Ride Sharing */}
            <Pressable
              style={styles.gridCell}
              onPress={handleRideSharePress}
            >
              <MaterialCommunityIcons name="car-multiple" size={28} color={appColors.icon} />
              <Text style={styles.gridCellTitle}>Ride Sharing</Text>
            </Pressable>

            <View style={styles.verticalDivider} />

            {/* 6. Print Center */}
            <Pressable
              style={styles.gridCell}
              onPress={handlePrintCenterPress}
            >
              <MaterialCommunityIcons name="printer-outline" size={28} color={appColors.icon} />
              <Text style={styles.gridCellTitle}>Print Center</Text>
            </Pressable>
          </View>
        </View>

        {/* Campus Highlights Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Campus Highlights</Text>
          <Pressable onPress={handleNextSpotlight} hitSlop={8} accessibilityLabel="Next campus highlight">
            <MaterialCommunityIcons name="chevron-right" size={22} color={appColors.slate800} />
          </Pressable>
        </View>

        <ScrollView
          ref={spotlightScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardWidth + 12}
          snapToAlignment="start"
          contentContainerStyle={styles.spotlightCarouselScroll}
          onScroll={(e) => {
            const offsetX = e.nativeEvent.contentOffset.x;
            const index = Math.round(offsetX / (cardWidth + 12));
            if (index >= 0 && index < upcomingEvents.length && index !== currentEventIndex) {
              setCurrentEventIndex(index);
            }
          }}
          onMomentumScrollEnd={(e) => {
            const offsetX = e.nativeEvent.contentOffset.x;
            const index = Math.round(offsetX / (cardWidth + 12));
            if (index >= 0 && index < upcomingEvents.length && index !== currentEventIndex) {
              setCurrentEventIndex(index);
            }
          }}
          scrollEventThrottle={16}
        >
          {upcomingEvents.map((evt, idx) => {
            const evtImage = idx === 0 ? CARNIVAL_IMAGE : idx === 1 ? TECH_TALK_IMAGE : MIDTERMS_IMAGE;
            return (
              <Pressable
                key={evt.id}
                style={[styles.spotlightBannerCard, { width: cardWidth }]}
                onPress={() => setSelectedEventForModal(evt)}
              >
                <View style={styles.spotlightBgImage}>
                  <Image source={evtImage} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} resizeMode="cover" />
                  <View style={styles.spotlightDarkGradientOverlay}>
                    <View style={styles.spotlightContentContainer}>
                      <View style={styles.spotlightWhitePill}>
                        <Text style={styles.spotlightWhitePillText}>{evt.tag}</Text>
                      </View>

                      <Text style={styles.spotlightBannerTitle} numberOfLines={2}>
                        {evt.title}
                      </Text>

                      <View style={styles.spotlightBannerMetaRow}>
                        <MaterialCommunityIcons name="calendar-month-outline" size={13} color={appColors.border} style={{ marginRight: 5 }} />
                        <Text style={styles.spotlightBannerMetaText}>{evt.dateTime}</Text>
                      </View>

                      <View style={styles.spotlightBannerMetaRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={13} color={appColors.border} style={{ marginRight: 5 }} />
                        <Text style={styles.spotlightBannerMetaText}>{evt.venue}</Text>
                      </View>

                      <View style={styles.spotlightViewDetailsPill}>
                        <Text style={styles.spotlightViewDetailsText}>{evt.ctaText} →</Text>
                      </View>
                    </View>

                    <View style={styles.spotlightDotsRow}>
                      {upcomingEvents.map((_, dotIdx) => (
                        <Pressable
                          key={dotIdx}
                          onPress={() => handleDotPress(dotIdx)}
                          hitSlop={6}
                        >
                          <View
                            style={[
                              styles.spotlightDotIndicator,
                              currentEventIndex === dotIdx && styles.spotlightDotIndicatorActive,
                            ]}
                          />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Your Activity Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Your Activity</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showAllActivity ? "Show fewer activity modules" : "View all activity modules"}
            accessibilityState={{ expanded: showAllActivity }}
            onPress={() => setShowAllActivity((value) => !value)}
            hitSlop={8}
            style={styles.seeAllButton}
          >
            <Text style={styles.sectionSeeAll}>{showAllActivity ? "Show less" : "View all"}</Text>
            <MaterialCommunityIcons
              name={showAllActivity ? "chevron-up" : "arrow-right"}
              size={14}
              color={appColors.textSecondary}
              style={{ marginLeft: 4 }}
            />
          </Pressable>
        </View>

        <View style={styles.activityCardContainer}>
          {activityModules.length ? (showAllActivity ? activityModules : activityModules.slice(0, 3)).map((module, index) => (
            <React.Fragment key={module.id}>
              {index > 0 && <View style={styles.activityDivider} />}
              <Pressable style={styles.activityRowItem} onPress={() => router.push(module.route as any)}>
                <MaterialCommunityIcons name={module.icon} size={24} color={appColors.icon} style={{ marginRight: 14 }} />
                <View style={styles.activityRowInfo}><Text style={styles.activityRowTitle}>{module.title}</Text></View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={appColors.slate400} />
              </Pressable>
            </React.Fragment>
          )) : <Text style={{ color: appColors.textSecondary, paddingVertical: 16 }}>Your modules will appear here as you use them.</Text>}
        </View>

        {/* Recommended for you Section (Real student photo, no AI pics) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Recommended for you</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendHorizontalScroll}>
          {recommendations.map(item => (
            <Pressable key={item.id} style={styles.recommendedCard} onPress={() => router.push(item.route as any)}>
              <MaterialCommunityIcons name={item.icon} size={30} color={appColors.icon} style={{ marginLeft: 14 }} />
              <View style={styles.recommendedContent}>
                <Text style={styles.recommendedTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.recommendedSub}>{item.label}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={appColors.slate400} style={{ marginRight: 12 }} />
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Search Modal */}
      <Modal visible={serviceSearchOpen} transparent animationType="fade" onRequestClose={() => setServiceSearchOpen(false)}>
        <View style={styles.searchModalBackdrop}>
          <View style={styles.searchModalCard}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.sectionHeading}>Campus services</Text>
              <Pressable accessibilityLabel="Close search" hitSlop={10} onPress={() => setServiceSearchOpen(false)}>
                <MaterialCommunityIcons name="close" size={22} color={appColors.ink} />
              </Pressable>
            </View>
            <View style={styles.searchModalInputRow}>
              <MaterialCommunityIcons name="magnify" size={20} color={appColors.slate400} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchModalInput}
                placeholder="Search..."
                placeholderTextColor={appColors.slate400}
                autoFocus
                value={serviceQuery}
                onChangeText={setServiceQuery}
              />
              {serviceQuery.length > 0 && (
                <Pressable onPress={() => setServiceQuery("")}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={appColors.slate400} />
                </Pressable>
              )}
            </View>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {searchableServices.map(item => (
                <Pressable
                  key={item.label}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setServiceSearchOpen(false);
                    router.push(item.route as any);
                  }}
                >
                  <MaterialCommunityIcons name={item.icon} size={22} color={appColors.slate800} style={{ marginRight: 12 }} />
                  <Text style={styles.searchResultText}>{item.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={appColors.slate400} />
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
                  <MaterialCommunityIcons name="close" size={22} color={appColors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.eventModalTitle}>{selectedEventForModal.title}</Text>

              <View style={{ gap: 6, marginVertical: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={15} color={appColors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.eventModalMeta}>{selectedEventForModal.dateTime}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="map-marker-outline" size={15} color={appColors.primary} style={{ marginRight: 6 }} />
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
    backgroundColor: appColors.white,
  },
  container: {
    flex: 1,
    backgroundColor: appColors.white,
  },
  content: {
    paddingHorizontal: 20,
    backgroundColor: appColors.white,
  },

  // Top Bar
  collapsibleTopBar: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: appColors.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 4 + headerGrow,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: appColors.headerBg,
  },
  topNavLeft: {
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    gap: 6,
  },
  brandTitleWrap: {
    justifyContent: "center",
  },
  topNavBrand: {
    fontSize: 24,
    fontWeight: "900",
    color: appColors.onHeader,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notificationHeaderButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadgePill: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: appColors.red500,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.white,
  },
  notificationBadgeText: {
    color: appColors.onHeader,
    fontSize: 7.5,
    fontWeight: "900",
    textAlign: "center",
  },
  profileHeaderButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  // Hero Greeting Section
  heroGreetingSection: {
    marginTop: 10,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroGreetingText: {
    flex: 1,
  },
  askButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: appColors.gold,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  askButtonText: {
    color: appColors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  heroGreetingSub: {
    fontSize: 15,
    fontWeight: "600",
    color: appColors.black,
    opacity: 0.4,
    marginBottom: 2,
  },
  heroGreetingName: {
    fontSize: 24,
    fontWeight: "900",
    color: appColors.black,
    letterSpacing: -0.4,
  },

  // Global Search Bar matching exact preview
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchPlaceholderText: {
    fontSize: 14,
    fontWeight: "400",
    color: appColors.slate400,
  },

  // LGU Campus Banner (Photo with exact 2.03 aspect ratio framing, zero text overlay)
  lguBannerContainer: {
    width: "100%",
    aspectRatio: 286 / 140,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: appColors.surfaceContainer,
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
    color: appColors.ink,
    letterSpacing: -0.3,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  sectionSeeAll: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },

  // Campus Services Grid with Soft Lines & Exact Preview Colors
  servicesGridBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: appColors.hairline,
    borderRadius: 16,
    backgroundColor: appColors.white,
    overflow: "hidden",
    marginBottom: 24,
  },
  servicesGridRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  moduleNotice: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  moduleNoticeText: { fontSize: 10, color: appColors.neutral500 },
  gridCell: {
    flex: 1,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  gridCellTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.slate700,
    marginTop: 6,
    textAlign: "center",
  },
  verticalDivider: {
    width: 1,
    height: "100%",
    backgroundColor: appColors.hairline,
  },
  horizontalDivider: {
    width: "100%",
    height: 1,
    backgroundColor: appColors.hairline,
  },

  // Campus Spotlight Carousel
  spotlightCarouselScroll: {
    gap: 12,
    marginBottom: 24,
  },
  spotlightBannerCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  spotlightBgImage: {
    width: "100%",
    height: 195,
  },
  spotlightDarkGradientOverlay: {
    flex: 1,
    backgroundColor: appColors.inkA42,
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
    backgroundColor: appColors.blackA55,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  spotlightWhitePillText: {
    color: appColors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  spotlightBannerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: appColors.white,
    letterSpacing: -0.3,
    marginBottom: 6,
    textShadowColor: appColors.blackA60,
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
    color: appColors.border,
    textShadowColor: appColors.blackA50,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  spotlightViewDetailsPill: {
    marginTop: 8,
  },
  spotlightViewDetailsText: {
    fontSize: 12,
    fontWeight: "800",
    color: appColors.white,
    textShadowColor: appColors.blackA50,
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
    backgroundColor: appColors.whiteA40,
  },
  spotlightDotIndicatorActive: {
    backgroundColor: appColors.white,
    width: 14,
    borderRadius: 3,
  },

  // Your Activity Section
  activityCardContainer: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.border,
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
    color: appColors.slate800,
  },
  activityDivider: {
    height: 1,
    backgroundColor: appColors.surfaceContainer,
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
    backgroundColor: appColors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: appColors.border,
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
    color: appColors.ink,
    lineHeight: 18,
  },
  recommendedSub: {
    fontSize: 11,
    fontWeight: "600",
    color: appColors.textMuted,
    marginTop: 3,
  },

  // Modals
  searchModalBackdrop: {
    flex: 1,
    backgroundColor: appColors.inkA35,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  searchModalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: appColors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: appColors.border,
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
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchModalInput: {
    flex: 1,
    fontSize: 14,
    color: appColors.ink,
    padding: 0,
    outlineStyle: "none" as any,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: appColors.surfaceContainer,
  },
  searchResultText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: appColors.slate800,
  },
  eventModalBackdrop: {
    flex: 1,
    backgroundColor: appColors.inkA40,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  eventModalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: appColors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  eventModalPill: {
    backgroundColor: appColors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventModalPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
  },
  eventModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: appColors.ink,
  },
  eventModalMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  eventModalDesc: {
    fontSize: 13,
    color: appColors.textSecondary,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
  },
  eventModalCtaBtn: {
    backgroundColor: appColors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  eventModalCtaText: {
    color: appColors.white,
    fontSize: 13,
    fontWeight: "800",
  },
});
