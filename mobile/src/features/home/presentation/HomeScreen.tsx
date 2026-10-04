import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
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
import { useResourceNotificationStore } from "../../resources/resourceNotifications";
import { useLostAndFoundNotificationStore } from "../../lost_and_found/lostAndFoundNotifications";
import { useTutoringNotificationStore } from "../../tutoring/tutoringNotifications";
import { useCampusNotificationStore } from "../../notifications/useCampusNotificationStore";
import CampusNotificationPopupModal from "../../notifications/presentation/CampusNotificationPopupModal";
import CampusNotificationCenterModal from "../../notifications/presentation/CampusNotificationCenterModal";

// Format enrollment session (e.g. SP 2023 / FA 2023)
const formatEnrollmentSession = (session?: any) => {
  if (session === null || session === undefined) return "SP 2023";
  const str = String(session).trim();
  if (!str) return "SP 2023";
  const raw = str.toUpperCase();

  const spMatch = raw.match(/^SP(RING)?\s*[-_]?\s*(\d{2,4})$/i);
  if (spMatch) {
    const year = spMatch[2].length === 2 ? `20${spMatch[2]}` : spMatch[2];
    return `SP ${year}`;
  }

  const faMatch = raw.match(/^F(ALL|A)?\s*[-_]?\s*(\d{2,4})$/i);
  if (faMatch) {
    const year = faMatch[2].length === 2 ? `20${faMatch[2]}` : faMatch[2];
    return `FA ${year}`;
  }

  if (/^\d{4}$/.test(raw)) {
    return `SP ${raw}`;
  }

  return raw;
};

// Format Department code (e.g. BSCS, BSSE, BSIT)
const formatDepartmentCode = (dept?: any) => {
  if (dept === null || dept === undefined) return "BSCS";
  const str = String(dept).trim();
  if (!str) return "BSCS";
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (clean === "cs" || clean === "bscs" || clean.includes("computerscience")) return "BSCS";
  if (clean === "se" || clean === "bsse" || clean.includes("softwareengineering")) return "BSSE";
  if (clean === "it" || clean === "bsit" || clean.includes("informationtechnology")) return "BSIT";
  if (clean === "ai" || clean === "bsai" || clean.includes("artificialintelligence")) return "BSAI";
  if (clean === "ds" || clean === "bsds" || clean.includes("datascience")) return "BSDS";
  if (clean === "ee" || clean === "bsee" || clean.includes("electricalengineering")) return "BSEE";
  if (clean === "bba" || clean.includes("businessadmin")) return "BBA";

  const upper = str.toUpperCase().replace(/\s+/g, "");
  if (upper.startsWith("BS") || upper.startsWith("MS") || upper.startsWith("BBA") || upper.startsWith("MBA")) {
    return upper;
  }
  return `BS${upper}`;
};

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
    tag: "Upcoming Mega Event",
    icon: "party-popper",
    title: "LGU Annual Winter Carnival & Food Fiesta 2026",
    eventDate: "2026-11-27T10:00:00",
    dateTime: "Friday, Nov 27 • 10:00 AM – 8:00 PM",
    venue: "Main Campus Grounds & Central Courtyard",
    description: "The biggest annual winter festival is coming! Enjoy 30+ student food stalls, live acoustic music stage, e-gaming tournament, startup project showcases, and cultural society performances.",
    ctaText: "Explore Carnival Info",
  },
  {
    id: "evt-mids",
    tag: "Academic Notification",
    icon: "file-document-edit-outline",
    title: "Fall 2026 Midterm Examination Date Sheet & Guidelines",
    eventDate: "2026-11-09T08:30:00",
    dateTime: "Starts Monday, Nov 9 • 8:30 AM",
    venue: "Main Examination Halls, Block A & C",
    description: "Official Midterm Date Sheet has been announced for all academic departments (BSCS, BSSE, BSIT, BSAI, BBA). Student ID cards and admit slips are mandatory for examination hall entry.",
    ctaText: "View Date Sheet & Rules",
  },
  {
    id: "evt-internals",
    tag: "Internal Evaluations",
    icon: "laptop-account",
    title: "Pre-Mid Internal Lab Evaluations & Quiz Week",
    eventDate: "2026-10-26T09:00:00",
    dateTime: "Starts Monday, Oct 26 • Regular Lab Slots",
    venue: "CS & SE Department Labs (1 to 6)",
    description: "Mandatory practical evaluations and project check-ins for Programming Fundamentals, Data Structures & Algorithms, Database Systems, and Object-Oriented Analysis.",
    ctaText: "Review Lab Syllabus",
  },
  {
    id: "evt-hackathon",
    tag: "Coding Challenge",
    icon: "code-braces",
    title: "LGU 24-Hour CodeFest & AI Innovation Challenge",
    eventDate: "2026-12-05T09:00:00",
    dateTime: "Saturday, Dec 5 • 9:00 AM – 9:00 PM",
    venue: "Software Incubation Center & Lab 2",
    description: "Form student peer teams to build creative mobile and AI solutions. Win shields, cash rewards, and direct recognition from tech industry mentors.",
    ctaText: "Register Peer Team",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const boxWidth = Math.floor((width - 32 - 10) / 2);

  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  // Filter out any event whose scheduled date/time has passed
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return ALL_CAMPUS_EVENTS.filter((evt) => {
      const eventTime = new Date(evt.eventDate);
      return eventTime >= now;
    });
  }, []);

  const activeEvent = useMemo(() => {
    if (!upcomingEvents.length) return null;
    return upcomingEvents[currentEventIndex % upcomingEvents.length];
  }, [upcomingEvents, currentEventIndex]);

  const [selectedEventForModal, setSelectedEventForModal] = useState<CampusSpotlightEvent | null>(null);

  const user = useSessionStore((state) => state.user);
  const accessToken = useSessionStore((state) => state.accessToken);
  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);
  const { headerTranslateY, handleScroll } = useCollapsibleHeader(topOffset + 44);

  const pendingTutoringRequests = useTutoringNotificationStore((state) => state.pendingRequestsCount);
  const hasNewLostClaims = useLostAndFoundNotificationStore((state) => state.hasNewClaims);
  const hasNewResources = useResourceNotificationStore((state) => state.hasNewResources);

  const getSortedModules = useModuleUsageStore((state) => state.getSortedModules);
  const recordVisit = useModuleUsageStore((state) => state.recordVisit);
  const visitCounts = useModuleUsageStore((state) => state.visitCounts);
  const hydrateUsage = useModuleUsageStore((state) => state.hydrate);

  useEffect(() => {
    void hydrateUsage();
  }, [hydrateUsage]);

  const sortedModules = useMemo(() => getSortedModules(), [getSortedModules, visitCounts]);
  const maxVisitCount = useMemo(() => {
    const counts = Object.values(visitCounts || {});
    return counts.length ? Math.max(...counts) : 0;
  }, [visitCounts]);
  const topUsedModules = useMemo(() => {
    return sortedModules.filter((m) => !m.isDummy).slice(0, 3);
  }, [sortedModules]);

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

  const displayName = user.full_name || user.display_name || user.email.split("@")[0];
  const rollNo = user.roll_no || user.roll_number || user.email.split("@")[0].toUpperCase();
  const sessionText = formatEnrollmentSession(user.enrollment_year);
  const departmentText = formatDepartmentCode(user.department);

  const isAdmin =
    user.role === "admin" ||
    (user.email && ["salman@lgu.edu.pk", "zahra@lgu.edu.pk"].includes(user.email.toLowerCase()));

  return (
    <View style={styles.rootContainer}>
      {/* Sleek Top Navigation Bar (Instagram Style) */}
      <Animated.View
        style={[
          styles.collapsibleTopBar,
          {
            paddingTop: topOffset > 0 ? topOffset + 2 : 8,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={styles.topNavLeft}>
          <Text style={styles.topNavBrand}>
            LGU <Text style={styles.topNavBrandAccent}>FellOo</Text>
          </Text>
        </View>

        <View style={styles.topRightActions}>
          <Pressable
            style={styles.notificationHeaderButton}
            onPress={openCenter}
            accessibilityLabel="Notifications"
          >
            <MaterialCommunityIcons
              name={unseenCount > 0 ? "bell-badge" : "bell-outline"}
              size={22}
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
            <MaterialCommunityIcons name="account-circle-outline" size={24} color="#0D3E02" />
          </Pressable>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.container}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topOffset + 58,
            paddingBottom: Math.max(insets.bottom, 16) + 84,
          },
        ]}
      >
        {/* Unboxed Breathing Greeting Header */}
        <View style={styles.heroGreetingSection}>
          <Text style={styles.heroGreetingSub}>{greeting},</Text>
          <Text style={styles.heroGreetingName} numberOfLines={1}>
            {displayName}
          </Text>
        </View>

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

        {/* My Top Visitings Card (Top 2 Modules Only) */}
        {maxVisitCount > 0 && (
          <View style={styles.topVisitingsCard}>
            <View style={styles.topVisitingsHeader}>
              <MaterialCommunityIcons name="trending-up" size={15} color="#0D3E02" style={{ marginRight: 6 }} />
              <Text style={styles.topVisitingsTitle}>MY TOP VISITINGS</Text>
            </View>
            <View style={styles.topVisitingsChipsRow}>
              {topUsedModules.slice(0, 2).map((item) => (
                <Pressable
                  key={`top-visit-${item.id}`}
                  style={({ pressed }) => [
                    styles.topVisitChip,
                    pressed && styles.topVisitChipPressed,
                  ]}
                  onPress={() => {
                    if (item.isDummy || !item.route) return;
                    router.push(item.route as any);
                    setTimeout(() => recordVisit(item.id), 500);
                  }}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={16}
                    color="#0D3E02"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.topVisitChipText}>{item.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Campus Services Section */}
        <View style={styles.servicesHeaderRow}>
          <Text style={styles.servicesTitle}>Campus Services</Text>
        </View>

        <View style={styles.servicesBoxGrid}>
          {sortedModules.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.serviceBoxCard,
                { width: boxWidth },
                pressed && styles.serviceBoxCardPressed,
              ]}
              onPress={() => {
                if (item.isDummy || !item.route) return;
                router.push(item.route as any);
                setTimeout(() => recordVisit(item.id), 500);
              }}
            >
              <View style={styles.serviceBoxTopRow}>
                <View style={[styles.serviceBoxIconCircle, { backgroundColor: item.bgColor }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={22} color="#ffffff" />
                </View>
                <View style={styles.serviceBoxArrowCircle}>
                  <MaterialCommunityIcons name="arrow-top-right" size={13} color="#94A3B8" />
                </View>
              </View>

              <View style={styles.serviceBoxTextWrap}>
                <Text style={styles.serviceBoxTitle}>{item.title}</Text>
                <Text style={styles.serviceBoxSub} numberOfLines={2}>{item.subTitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Campus Spotlight & Highlights Header */}
        <View style={styles.spotlightSectionHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={18}
              color="#0D3E02"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.spotlightSectionTitle}>Campus Spotlight & Highlights</Text>
          </View>
          <View style={styles.spotlightUpcomingBadge}>
            <View style={styles.spotlightLiveDot} />
            <Text style={styles.spotlightUpcomingText}>UPCOMING</Text>
          </View>
        </View>

        {/* Signature Emerald Campus Spotlight Card */}
        {activeEvent ? (
          <Pressable
            style={styles.spotlightCard}
            onPress={() => setSelectedEventForModal(activeEvent)}
          >
            <View style={styles.spotlightHeader}>
              <View style={styles.spotlightTagPill}>
                <View style={styles.spotlightLiveDot} />
                <Text style={styles.spotlightTagText}>
                  {activeEvent.tag}
                </Text>
              </View>

              {upcomingEvents.length > 1 && (
                <View style={styles.spotlightPagingRow}>
                  {upcomingEvents.map((_, idx) => (
                    <Pressable
                      key={idx}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setCurrentEventIndex(idx);
                      }}
                      style={[
                        styles.spotlightDot,
                        (currentEventIndex % upcomingEvents.length) === idx && styles.spotlightDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            <Text style={styles.spotlightTitle} numberOfLines={1}>
              {activeEvent.title}
            </Text>

            <View style={styles.spotlightLocationRow}>
              <MaterialCommunityIcons name="calendar-clock" size={13} color="#FDBF1E" style={{ marginRight: 5 }} />
              <Text style={styles.spotlightLocation} numberOfLines={1}>
                {activeEvent.dateTime} • {activeEvent.venue}
              </Text>
            </View>

            <View style={styles.spotlightActionsRow}>
              <View style={styles.spotlightCtaBtn}>
                <Text style={styles.spotlightCtaText}>View Event Details</Text>
                <MaterialCommunityIcons name="arrow-right" size={14} color="#0D3E02" />
              </View>

              {upcomingEvents.length > 1 && (
                <Pressable
                  style={styles.spotlightNextBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setCurrentEventIndex((prev) => (prev + 1) % upcomingEvents.length);
                  }}
                >
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#ffffff" />
                </Pressable>
              )}
            </View>
          </Pressable>
        ) : (
          <View style={styles.spotlightEmptyCard}>
            <MaterialCommunityIcons name="calendar-check" size={28} color="#166534" style={{ marginBottom: 6 }} />
            <Text style={styles.spotlightEmptyTitle}>All Caught Up</Text>
            <Text style={styles.spotlightEmptySub}>
              No upcoming events at this moment. Check back soon for new campus announcements!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* On-Screen Notification Alert Pop-up Modal */}
      <CampusNotificationPopupModal />

      {/* Slide-Up Notification Center Sheet */}
      <CampusNotificationCenterModal />

      {/* Dedicated Upcoming Event Details Modal */}
      <Modal
        visible={!!selectedEventForModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEventForModal(null)}
      >
        <View style={styles.eventModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedEventForModal(null)} />
          {selectedEventForModal && (
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
                <MaterialCommunityIcons name="calendar-clock" size={16} color="#0D3E02" style={{ marginRight: 6 }} />
                <Text style={styles.eventModalMetaText}>{selectedEventForModal.dateTime}</Text>
              </View>

              <View style={styles.eventModalMetaRow}>
                <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color="#0D3E02" style={{ marginRight: 6 }} />
                <Text style={styles.eventModalMetaText}>{selectedEventForModal.venue}</Text>
              </View>

              <View style={styles.eventModalDescBox}>
                <Text style={styles.eventModalDescText}>{selectedEventForModal.description}</Text>
              </View>

              <Pressable
                style={styles.eventModalDismissBtn}
                onPress={() => setSelectedEventForModal(null)}
              >
                <Text style={styles.eventModalDismissBtnText}>Close</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
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
    padding: 16,
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
    paddingBottom: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hamburgerButton: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  hamburgerLine: {
    width: 17,
    height: 2,
    backgroundColor: "#0D3E02",
    borderRadius: 2,
  },
  topNavLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  topNavBrand: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.3,
  },
  topNavBrandAccent: {
    color: "#0D3E02",
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  notificationBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
  },
  profileHeaderButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  heroGreetingSection: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  heroGreetingSub: {
    fontSize: 16,
    fontWeight: "800",
    color: "#D97706",
    textTransform: "uppercase",
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  heroGreetingName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.4,
    lineHeight: 35,
  },

  // Alert Notice
  alertNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  alertNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    flex: 1,
    lineHeight: 16,
  },

  // Campus Services
  servicesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  servicesTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  servicesBoxGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 26,
  },
  serviceBoxCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: "space-between",
    minHeight: 132,
  },
  serviceBoxCardPressed: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    transform: [{ scale: 0.985 }],
  },
  serviceBoxTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  serviceBoxIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  // My Top Visitings Card
  topVisitingsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  topVisitingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  topVisitingsTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0D3E02",
    letterSpacing: 0.6,
  },
  topVisitingsChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  topVisitChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topVisitChipPressed: {
    backgroundColor: "#E2E8F0",
    transform: [{ scale: 0.98 }],
  },
  topVisitChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  serviceBoxArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceBoxTextWrap: {
    gap: 2,
  },
  serviceBoxTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  serviceBoxSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 15,
    fontWeight: "500",
  },

  // Spotlight Section Header
  spotlightSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  spotlightSectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.3,
  },
  spotlightUpcomingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  spotlightUpcomingText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
    letterSpacing: 0.5,
  },

  // Classic Signature Emerald Spotlight Card
  spotlightCard: {
    backgroundColor: "#0D3E02",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  spotlightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  spotlightTagPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  spotlightLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FDBF1E",
    marginRight: 6,
  },
  spotlightTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
  spotlightTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
    lineHeight: 22,
  },
  spotlightLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  spotlightLocation: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FDBF1E",
    flex: 1,
  },
  spotlightPagingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  spotlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  spotlightDotActive: {
    width: 14,
    backgroundColor: "#FDBF1E",
  },
  spotlightActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  spotlightCtaBtn: {
    flex: 1,
    backgroundColor: "#FDBF1E",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  spotlightCtaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D3E02",
  },
  spotlightNextBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  spotlightEmptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  spotlightEmptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  spotlightEmptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },

  // Dedicated Event Modal
  eventModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  eventModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  eventModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  eventModalTagBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  eventModalTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D3E02",
  },
  eventModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  eventModalTitle: {
    fontSize: 17,
    fontWeight: "800",
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
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  eventModalDescBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  eventModalDescText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  eventModalDismissBtn: {
    backgroundColor: "#0D3E02",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  eventModalDismissBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
