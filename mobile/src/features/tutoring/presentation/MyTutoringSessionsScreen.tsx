import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
import { SkeletonList, TutoringSessionCardSkeleton } from "../../../core/components/Skeleton";
import { useDataStore } from "../../../core/store/DataStoreContext";
import {
  fetchTutoringSessions,
  updateTutoringSessionStatus,
} from "../data/tutoringApi";
import { useTutoringNotificationStore } from "../tutoringNotifications";
import { RateTutorModal } from "./RateTutorModal";
import type { TutoringSession } from "../tutoring";

export function MyTutoringSessionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const { hasActiveTutorProfile, pollSummary } = useTutoringNotificationStore();
  const { tutoringSessions: cachedSessions, setTutoringSessions } = useDataStore();

  const [activeTab, setActiveTab] = useState<"learner" | "tutor" | "history">("learner");
  const [sessions, setSessions] = useState<TutoringSession[]>(() => cachedSessions || []);
  const [isLoading, setIsLoading] = useState(() => !(cachedSessions && cachedSessions.length > 0));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratingSession, setRatingSession] = useState<TutoringSession | null>(null);

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  const loadSessions = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else if (!sessions.length) setIsLoading(true);

      try {
        if (activeTab === "tutor" && !hasActiveTutorProfile) {
          setSessions([]);
          return;
        }

        const params: any = {};
        if (activeTab === "learner") {
          params.role = "learner";
        } else if (activeTab === "tutor") {
          params.role = "tutor";
        }

        const data = await fetchTutoringSessions(params);
        let list = data.results || [];
        if (activeTab === "learner") {
          setTutoringSessions(list);
        }
        if (activeTab === "history") {
          list = list.filter((s) => s.status === "completed" || s.status === "cancelled" || s.status === "declined");
        } else {
          list = list.filter((s) => s.status === "pending" || s.status === "accepted");
        }
        setSessions(list);
      } catch (err) {
        console.error("Error loading sessions:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, hasActiveTutorProfile, sessions.length, setTutoringSessions],
  );

  useEffect(() => {
    if (activeTab === "learner" && cachedSessions && cachedSessions.length > 0) {
      const activeList = cachedSessions.filter((s) => s.status === "pending" || s.status === "accepted");
      setSessions(activeList);
      setIsLoading(false);
      pollSummary();
      return;
    }
    loadSessions();
    pollSummary();
  }, [activeTab, loadSessions, pollSummary]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/tutoring");
    }
  };

  const handleStatusChange = async (
    sessionId: number,
    newStatus: "accepted" | "declined" | "cancelled" | "completed",
    sessionItem?: TutoringSession,
  ) => {
    try {
      const updated = await updateTutoringSessionStatus(sessionId, newStatus);
      await loadSessions(true);
      await pollSummary();

      if (newStatus === "completed") {
        const isUserLearner =
          sessionItem &&
          (sessionItem.learner_id === user?.id || sessionItem.learner_email === user?.email);
        const isLearnerRole = isUserLearner || activeTab === "learner";

        if (isLearnerRole && (!sessionItem || !sessionItem.review)) {
          // Trigger bottom sheet review popup immediately for student
          setRatingSession(updated || sessionItem || null);
        } else {
          Alert.alert("Session Completed", "Great job! The tutoring session is now marked completed.");
        }
      } else {
        Alert.alert("Success", `Session marked as ${newStatus}.`);
      }
    } catch (err) {
      console.error("Error updating session:", err);
      Alert.alert("Error", "Could not update session status. Please try again.");
    }
  };

  const formatSessionTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={handleBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>My Tutoring Sessions</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabBtn, activeTab === "learner" && styles.tabBtnActive]}
          onPress={() => setActiveTab("learner")}
        >
          <View style={styles.tabContentRow}>
            <MaterialCommunityIcons
              name="book-open-outline"
              size={14}
              color={activeTab === "learner" ? "#FDBF1E" : "#475569"}
              style={{ marginRight: 4 }}
            />
            <Text
              numberOfLines={1}
              style={[styles.tabBtnText, activeTab === "learner" && styles.tabBtnTextActive]}
            >
              Bookings
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === "tutor" && styles.tabBtnActive]}
          onPress={() => setActiveTab("tutor")}
        >
          <View style={styles.tabContentRow}>
            <MaterialCommunityIcons
              name="school-outline"
              size={14}
              color={activeTab === "tutor" ? "#FDBF1E" : "#475569"}
              style={{ marginRight: 4 }}
            />
            <Text
              numberOfLines={1}
              style={[styles.tabBtnText, activeTab === "tutor" && styles.tabBtnTextActive]}
            >
              Requests
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === "history" && styles.tabBtnActive]}
          onPress={() => setActiveTab("history")}
        >
          <View style={styles.tabContentRow}>
            <MaterialCommunityIcons
              name="history"
              size={14}
              color={activeTab === "history" ? "#FDBF1E" : "#475569"}
              style={{ marginRight: 4 }}
            />
            <Text
              numberOfLines={1}
              style={[styles.tabBtnText, activeTab === "history" && styles.tabBtnTextActive]}
            >
              History
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Content List */}
      {isLoading ? (
        <SkeletonList
          count={4}
          renderItem={() => <TutoringSessionCardSkeleton />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 40, 60) },
          ]}
        />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 40, 60) },
          ]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadSessions(true)} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons
                  name={
                    activeTab === "learner"
                      ? "calendar-clock-outline"
                      : activeTab === "tutor"
                      ? "school-outline"
                      : "history"
                  }
                  size={40}
                  color="#0D3E02"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === "learner"
                  ? "No active bookings"
                  : activeTab === "tutor"
                  ? !hasActiveTutorProfile
                    ? "Tutor Profile Disabled"
                    : "No incoming requests"
                  : "No completed sessions yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "learner"
                  ? "Browse the tutor feed to find a peer tutor and book a session!"
                  : activeTab === "tutor"
                  ? !hasActiveTutorProfile
                    ? "You have disabled your tutor profile. Enable it in Profile Setup whenever you want to accept student requests."
                    : "Make sure your tutor profile is active so other students can request sessions."
                  : "Completed sessions and reviews will appear here."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isUserLearner = item.learner_id === user?.id || item.learner_email === user?.email;
            const isUserTutor = item.tutor_id === user?.id || item.tutor_email === user?.email;
            const isLearner = isUserLearner || activeTab === "learner";

            return (
              <View style={styles.sessionCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectTitle}>{item.subject_or_skill}</Text>
                    
                    {/* Tutor & Learner Names */}
                    <View style={{ marginTop: 4, gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <MaterialCommunityIcons name="school-outline" size={13} color="#0D3E02" style={{ marginRight: 4 }} />
                        <Text style={styles.partnerText}>
                          Tutor:{" "}
                          <Text style={{ fontWeight: "700", color: "#0D3E02" }}>{item.tutor_name || "Peer Tutor"}</Text>
                          {item.tutor_department ? ` (${item.tutor_department})` : ""}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <MaterialCommunityIcons name="account-outline" size={13} color="#070D1F" style={{ marginRight: 4 }} />
                        <Text style={styles.partnerText}>
                          Learner:{" "}
                          <Text style={{ fontWeight: "700", color: "#070D1F" }}>{item.learner_name || "Student"}</Text>
                          {item.learner_department ? ` (${item.learner_department})` : ""}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      item.status === "pending"
                        ? styles.badgePending
                        : item.status === "accepted"
                        ? styles.badgeAccepted
                        : item.status === "completed"
                        ? styles.badgeCompleted
                        : styles.badgeDeclined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        item.status === "pending"
                          ? styles.statusTextPending
                          : item.status === "accepted"
                          ? styles.statusTextAccepted
                          : item.status === "completed"
                          ? styles.statusTextCompleted
                          : styles.statusTextDeclined,
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Session Meta */}
                <View style={styles.metaRow}>
                  <Text style={styles.metaItem}>🗓️ {formatSessionTime(item.scheduled_at)}</Text>
                  <Text style={styles.metaItem}>⏱️ {item.duration_minutes} mins</Text>
                  <Text style={styles.metaItem}>
                    {item.meeting_mode === "on_campus" ? "🏫 On Campus" : "💻 Online"}
                  </Text>
                </View>

                {/* Location / Link */}
                <View style={styles.locationBox}>
                  <Text style={styles.locationLabel}>
                    {item.meeting_mode === "on_campus" ? "📍 Location:" : "🔗 Platform/Link:"}
                  </Text>
                  <Text style={styles.locationVal}>{item.location_or_link}</Text>
                </View>

                {/* Notes */}
                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Notes / Topics:</Text>
                    <Text style={styles.notesText}>{item.notes}</Text>
                  </View>
                ) : null}

                {/* Review if already reviewed */}
                {item.review ? (
                  <View style={styles.reviewSnippet}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {[...Array(item.review.rating)].map((_, i) => (
                        <MaterialCommunityIcons key={i} name="star" size={14} color="#FDBF1E" />
                      ))}
                    </View>
                    {item.review.comment ? (
                      <Text style={styles.reviewComment}>"{item.review.comment}"</Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  {/* Chat button for accepted or completed sessions */}
                  {(item.status === "accepted" || item.status === "completed") && (
                    <Pressable
                      style={styles.chatBtn}
                      onPress={() => router.push(`/(app)/tutoring/chat/${item.id}`)}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <MaterialCommunityIcons name="chat-outline" size={15} color="#0D3E02" style={{ marginRight: 4 }} />
                        <Text style={styles.chatBtnText}>Session Chat</Text>
                      </View>
                    </Pressable>
                  )}

                  {/* Tutor incoming request actions: Accept / Decline */}
                  {!isLearner && item.status === "pending" && (
                    <View style={styles.btnRow}>
                      <Pressable
                        style={styles.acceptBtn}
                        onPress={() => handleStatusChange(item.id, "accepted")}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <MaterialCommunityIcons name="check" size={14} color="#ffffff" style={{ marginRight: 3 }} />
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        style={styles.declineBtn}
                        onPress={() => handleStatusChange(item.id, "declined")}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <MaterialCommunityIcons name="close" size={14} color="#DC2626" style={{ marginRight: 3 }} />
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </View>
                      </Pressable>
                    </View>
                  )}

                  {/* Student actions for pending sessions: Cancel */}
                  {isLearner && item.status === "pending" && (
                    <Pressable
                      style={styles.cancelBtn}
                      onPress={() => handleStatusChange(item.id, "cancelled")}
                    >
                      <Text style={styles.cancelBtnText}>Cancel Request</Text>
                    </Pressable>
                  )}

                  {/* Complete session button */}
                  {item.status === "accepted" && (
                    <Pressable
                      style={styles.completeBtn}
                      onPress={() => handleStatusChange(item.id, "completed", item)}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <MaterialCommunityIcons name="check-circle-outline" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={styles.completeBtnText}>Mark Completed</Text>
                      </View>
                    </Pressable>
                  )}

                  {/* Rate tutor button for student if completed and not reviewed */}
                  {isLearner && item.status === "completed" && !item.review && (
                    <Pressable
                      style={styles.rateBtn}
                      onPress={() => setRatingSession(item)}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <MaterialCommunityIcons name="star-outline" size={15} color="#92400E" style={{ marginRight: 4 }} />
                        <Text style={styles.rateBtnText}>Rate Tutor</Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Rating Modal */}
      {ratingSession && (
        <RateTutorModal
          visible={Boolean(ratingSession)}
          session={ratingSession}
          onClose={() => setRatingSession(null)}
          onSuccess={() => {
            setRatingSession(null);
            void loadSessions(true);
            void pollSummary();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  topNavBar: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.3,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 4,
  },
  tabBtnActive: {
    backgroundColor: "#0D3E02",
  },
  tabContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
    includeFontPadding: false,
  },
  tabBtnTextActive: {
    color: "#FDBF1E",
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#64748B",
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  sessionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  partnerText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
  },
  badgeAccepted: {
    backgroundColor: "#E8F5E9",
  },
  badgeCompleted: {
    backgroundColor: "#DCFCE7",
  },
  badgeDeclined: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
  statusTextPending: {
    color: "#92400E",
  },
  statusTextAccepted: {
    color: "#0D3E02",
  },
  statusTextCompleted: {
    color: "#166534",
  },
  statusTextDeclined: {
    color: "#991B1B",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metaItem: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  locationBox: {
    flexDirection: "row",
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginRight: 4,
  },
  locationVal: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
  },
  notesBox: {
    marginTop: 4,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 16,
  },
  reviewSnippet: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  reviewStars: {
    fontSize: 12,
    marginBottom: 2,
  },
  reviewComment: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#78350F",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  chatBtn: {
    flex: 1,
    backgroundColor: "#0D3E02",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  chatBtnText: {
    color: "#FDBF1E",
    fontSize: 13,
    fontWeight: "800",
  },
  btnRow: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#0D3E02",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptBtnText: {
    color: "#FDBF1E",
    fontSize: 13,
    fontWeight: "800",
  },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
  },
  declineBtnText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  completeBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  completeBtnText: {
    color: "#0D3E02",
    fontSize: 12,
    fontWeight: "700",
  },
  rateBtn: {
    flex: 1,
    backgroundColor: "#FDBF1E",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  rateBtnText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#070D1F",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
});
