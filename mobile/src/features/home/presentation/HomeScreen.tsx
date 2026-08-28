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
import { useDrawerStore } from "../../../core/navigation/drawerStore";
import { useCollapsibleHeader } from "../../../core/navigation/useCollapsibleHeader";
import { useModuleUsageStore } from "../../../core/store/useModuleUsageStore";
import { fetchMe } from "../../auth/data/authApi";
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

const UPCOMING_CAMPUS_EVENTS = [
  {
    id: "evt-1",
    tag: "Upcoming Workshop",
    icon: "laptop-account",
    title: "AI & Mobile App Development Workshop",
    dateTime: "Friday, Sept 5 • 3:30 PM",
    venue: "Main CS Lab 3, Block B",
    description: "Hands-on bootcamp on React Native, Django REST APIs, and collaborative Git workflow with senior peer mentors.",
    ctaText: "View Workshop Info",
  },
  {
    id: "evt-2",
    tag: "Campus Seminar",
    icon: "school-outline",
    title: "Careers in Tech & Freelancing Guide",
    dateTime: "Wednesday, Sept 10 • 11:00 AM",
    venue: "LGU Main Auditorium",
    description: "Senior alumni panel sharing practical insights on software engineering interviews, remote jobs, and freelancing.",
    ctaText: "Explore Seminar Info",
  },
  {
    id: "evt-3",
    tag: "Coding Challenge",
    icon: "code-braces",
    title: "LGU Speed Coding & DSA Contest",
    dateTime: "Monday, Sept 15 • 2:00 PM",
    venue: "Software Engineering Lab 1",
    description: "Compete with peers to solve algorithmic puzzles. Earn certificates, rewards, and peer tutoring badges.",
    ctaText: "Contest Details",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const boxWidth = Math.floor((width - 32 - 10) / 2);

  const [activeTab, setActiveTab] = useState<"spotlight" | "activity">("spotlight");
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [selectedEventForModal, setSelectedEventForModal] = useState<(typeof UPCOMING_CAMPUS_EVENTS)[0] | null>(null);

  const user = useSessionStore((state) => state.user);
  const accessToken = useSessionStore((state) => state.accessToken);
  const updateUser = useSessionStore((state) => state.updateUser);
  const openDrawer = useDrawerStore((state) => state.openDrawer);

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);
  const { headerTranslateY, handleScroll } = useCollapsibleHeader(topOffset + 54);

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
      fetchMe()
        .then((me) => updateUser(me))
        .catch(() => {});
      void fetchNotifications();
    }
  }, [accessToken, updateUser, fetchNotifications]);

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
      {/* Sleek Top Navigation Bar */}
      <Animated.View
        style={[
          styles.collapsibleTopBar,
          {
            paddingTop: topOffset + 6,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <Pressable style={styles.hamburgerButton} onPress={openDrawer}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </Pressable>

        <View style={styles.topNavCenter}>
          <Text style={styles.topNavBrand}>
            LGU <Text style={styles.topNavBrandAccent}>FellOo</Text>
          </Text>
        </View>

        <View style={styles.topRightActions}>
          <Pressable
            style={styles.notificationHeaderButton}
            onPress={openCenter}
          >
            <MaterialCommunityIcons
              name={unseenCount > 0 ? "bell-badge" : "bell-outline"}
              size={20}
              color={unseenCount > 0 ? "#0D3E02" : "#0D3E02"}
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
          >
            <View style={styles.headerAvatar}>
              <MaterialCommunityIcons name="account" size={19} color="#FDBF1E" />
            </View>
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
            paddingTop: topOffset + 62,
            paddingBottom: Math.max(insets.bottom + 16, 20),
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
                    color={item.iconColor}
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
                  <MaterialCommunityIcons name={item.icon as any} size={22} color={item.iconColor} />
                </View>
                <View style={styles.serviceBoxArrowCircle}>
                  <MaterialCommunityIcons name="arrow-top-right" size={13} color={item.iconColor} />
                </View>
              </View>

              <View style={styles.serviceBoxTextWrap}>
                <Text style={styles.serviceBoxTitle}>{item.title}</Text>
                <Text style={styles.serviceBoxSub} numberOfLines={2}>{item.subTitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Segmented Campus Hub Tabs */}
        <View style={styles.segmentContainer}>
          <View style={styles.segmentBar}>
            <Pressable
              style={[styles.segmentBtn, activeTab === "spotlight" && styles.segmentBtnActive]}
              onPress={() => setActiveTab("spotlight")}
            >
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={16}
                color={activeTab === "spotlight" ? "#0D3E02" : "#64748B"}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentBtnText, activeTab === "spotlight" && styles.segmentBtnTextActive]}>
                Campus Spotlight
              </Text>
            </Pressable>

            <Pressable
              style={[styles.segmentBtn, activeTab === "activity" && styles.segmentBtnActive]}
              onPress={() => setActiveTab("activity")}
            >
              <MaterialCommunityIcons
                name="history"
                size={16}
                color={activeTab === "activity" ? "#0D3E02" : "#64748B"}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentBtnText, activeTab === "activity" && styles.segmentBtnTextActive]}>
                My Activity
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Tab 1: Classic Signature Emerald Campus Spotlight Card */}
        {activeTab === "spotlight" ? (
          <Pressable
            style={styles.spotlightCard}
            onPress={() => setSelectedEventForModal(UPCOMING_CAMPUS_EVENTS[currentEventIndex])}
          >
            <View style={styles.spotlightHeader}>
              <View style={styles.spotlightTagPill}>
                <View style={styles.spotlightLiveDot} />
                <Text style={styles.spotlightTagText}>
                  {UPCOMING_CAMPUS_EVENTS[currentEventIndex].tag}
                </Text>
              </View>

              <View style={styles.spotlightPagingRow}>
                {UPCOMING_CAMPUS_EVENTS.map((_, idx) => (
                  <Pressable
                    key={idx}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setCurrentEventIndex(idx);
                    }}
                    style={[
                      styles.spotlightDot,
                      currentEventIndex === idx && styles.spotlightDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            <Text style={styles.spotlightTitle} numberOfLines={1}>
              {UPCOMING_CAMPUS_EVENTS[currentEventIndex].title}
            </Text>

            <View style={styles.spotlightLocationRow}>
              <MaterialCommunityIcons name="calendar-clock" size={13} color="#FDBF1E" style={{ marginRight: 5 }} />
              <Text style={styles.spotlightLocation} numberOfLines={1}>
                {UPCOMING_CAMPUS_EVENTS[currentEventIndex].dateTime} • {UPCOMING_CAMPUS_EVENTS[currentEventIndex].venue}
              </Text>
            </View>

            <View style={styles.spotlightActionsRow}>
              <View style={styles.spotlightCtaBtn}>
                <Text style={styles.spotlightCtaText}>View Event Details</Text>
                <MaterialCommunityIcons name="arrow-right" size={14} color="#0D3E02" />
              </View>

              {UPCOMING_CAMPUS_EVENTS.length > 1 && (
                <Pressable
                  style={styles.spotlightNextBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setCurrentEventIndex((prev) => (prev + 1) % UPCOMING_CAMPUS_EVENTS.length);
                  }}
                >
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#ffffff" />
                </Pressable>
              )}
            </View>
          </Pressable>
        ) : (
          /* Tab 2: My Activity */
          <View style={styles.activityList}>
            <Pressable
              style={styles.activityCard}
              onPress={() => router.push("/(app)/resources/mine" as any)}
            >
              <View style={[styles.activityIconBox, { backgroundColor: "#FFF8E1" }]}>
                <MaterialCommunityIcons name="storefront" size={20} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.activityTitleRow}>
                  <Text style={styles.activityCardTitle}>Marketplace Ads</Text>
                  <Text style={styles.activityChipGold}>Active</Text>
                </View>
                <Text style={styles.activityCardSub}>Manage your posted items and inquiries</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={styles.activityCard}
              onPress={() => router.push("/(app)/lost-and-found/mine" as any)}
            >
              <View style={[styles.activityIconBox, { backgroundColor: "#DCFCE7" }]}>
                <MaterialCommunityIcons name="map-marker-question" size={20} color="#166534" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.activityTitleRow}>
                  <Text style={styles.activityCardTitle}>My Lost Notices</Text>
                  <Text style={styles.activityChipGreen}>Live</Text>
                </View>
                <Text style={styles.activityCardSub}>Track status & claim verification chats</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={styles.activityCard}
              onPress={() => router.push("/(app)/tutoring/sessions/mine" as any)}
            >
              <View style={[styles.activityIconBox, { backgroundColor: "#E8F5E9" }]}>
                <MaterialCommunityIcons name="account-school" size={20} color="#0D3E02" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.activityTitleRow}>
                  <Text style={styles.activityCardTitle}>Tutoring Bookings</Text>
                  <Text style={styles.activityChipGreen}>Sessions</Text>
                </View>
                <Text style={styles.activityCardSub}>Scheduled study meetings & chat</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>
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
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 3,
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
  topNavCenter: {
    alignItems: "center",
  },
  topNavBrand: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D3E02",
    letterSpacing: -0.3,
  },
  topNavBrandAccent: {
    color: "#FDBF1E",
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
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 2,
    borderWidth: 1.5,
    borderColor: "#FDBF1E",
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0D3E02",
    justifyContent: "center",
    alignItems: "center",
  },
  heroGreetingSection: {
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 4,
  },
  heroGreetingSub: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FDBF1E",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroGreetingName: {
    fontSize: 27,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.4,
    lineHeight: 34,
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

  // Segments
  segmentContainer: {
    marginBottom: 12,
  },
  segmentBar: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentBtnTextActive: {
    color: "#0D3E02",
    fontWeight: "800",
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

  // Activity List
  activityList: {
    gap: 8,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  activityTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activityCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  activityChipGold: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activityChipGreen: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D3E02",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activityCardSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },

  // Dedicated Event Modal
  eventModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
