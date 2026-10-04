import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchTutor } from "../data/tutoringApi";
import { TutorProfileSkeleton } from "../../../core/components/Skeleton";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { BookSessionModal } from "./BookSessionModal";
import type { TutorProfile } from "../tutoring";

export function TutorProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tutorId = Number(id);
  const { tutors } = useDataStore();

  const cachedTutor = (tutors || []).find((t: TutorProfile) => t.id === tutorId) || null;

  const [tutor, setTutor] = useState<TutorProfile | null>(() => cachedTutor);
  const [isLoading, setIsLoading] = useState(() => !cachedTutor);
  const [isBookModalVisible, setIsBookModalVisible] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  useEffect(() => {
    if (!tutorId) return;
    if (!cachedTutor && !tutor) setIsLoading(true);
    fetchTutor(tutorId)
      .then((data) => setTutor(data))
      .catch((err) => console.error("Error loading tutor profile:", err))
      .finally(() => setIsLoading(false));
  }, [tutorId, cachedTutor]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable
            style={styles.navBackBtn}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
          </Pressable>
          <Text style={styles.topNavTitle}>Tutor Profile</Text>
          <View style={{ width: 36 }} />
        </View>
        <TutorProfileSkeleton />
      </View>
    );
  }

  if (!tutor) {
    return (
      <View style={[styles.errorContainer, { paddingTop: topOffset + 20 }]}>
        <MaterialCommunityIcons name="magnify" size={48} color="#64748b" style={{ marginBottom: 12 }} />
        <Text style={styles.errorTitle}>Tutor not found</Text>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>Tutor Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 95 },
        ]}
      >
        {/* Header Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={44} color="#FDBF1E" />
          </View>

          <Text style={styles.tutorName}>{tutor.tutor_name}</Text>
          <Text style={styles.tutorDept}>
            {tutor.tutor_department || "LGU Student"}
            {tutor.tutor_enrollment_year ? ` • ${tutor.tutor_enrollment_year}` : ""}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              {Number(tutor.average_rating) > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="star" size={14} color="#FDBF1E" style={{ marginRight: 2 }} />
                  <Text style={styles.statVal}>{Number(tutor.average_rating).toFixed(1)}</Text>
                </View>
              ) : (
                <Text style={styles.statVal}>NEW</Text>
              )}
              <Text style={styles.statLabel}>{tutor.total_reviews} Reviews</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statVal} numberOfLines={1}>
                {tutor.tutor_department || "LGU"}
              </Text>
              <Text style={styles.statLabel}>Department</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statVal}>
                {tutor.profile_type === "tutor" ? "Tutor" : tutor.profile_type === "mentor" ? "Mentor" : "Both"}
              </Text>
              <Text style={styles.statLabel}>Role</Text>
            </View>
          </View>
        </View>

        {/* Headline */}
        <View style={styles.section}>
          <Text style={styles.headlineText}>"{tutor.headline}"</Text>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.bodyText}>{tutor.bio}</Text>
        </View>

        {/* Subjects Offered */}
        {tutor.subjects.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <MaterialCommunityIcons name="book-open-page-variant" size={16} color="#0D3E02" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Academic Course Tutoring</Text>
            </View>
            <View style={styles.tagsContainer}>
              {tutor.subjects.map((sub, idx) => (
                <View key={idx} style={styles.subjectPill}>
                  <Text style={styles.subjectPillText}>{sub}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Skills & Mentorship */}
        {tutor.skills.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <MaterialCommunityIcons name="briefcase-outline" size={16} color="#92400E" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Practical Skills & Mentorship</Text>
            </View>
            <View style={styles.tagsContainer}>
              {tutor.skills.map((skill, idx) => (
                <View key={idx} style={styles.skillPill}>
                  <Text style={styles.skillPillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Availability */}
        {tutor.availability ? (
          <View style={styles.section}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <MaterialCommunityIcons name="calendar-clock-outline" size={16} color="#0D3E02" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Availability Schedule</Text>
            </View>
            <Text style={styles.bodyText}>{tutor.availability}</Text>
          </View>
        ) : null}

        {/* Recent Student Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Reviews ({tutor.total_reviews})</Text>
          {tutor.recent_reviews && tutor.recent_reviews.length > 0 ? (
            tutor.recent_reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{rev.reviewer_name}</Text>
                  <View style={{ flexDirection: "row" }}>
                    {[...Array(rev.rating)].map((_, i) => (
                      <MaterialCommunityIcons key={i} name="star" size={14} color="#FDBF1E" />
                    ))}
                  </View>
                </View>
                {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
              </View>
            ))
          ) : (
            <Text style={styles.emptyReviewText}>No reviews yet. Be the first to book and rate a session!</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar with Safe Area Bottom Padding */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom + 12, 18),
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomBarTitle}>
            Academic Session
          </Text>
          <Text style={styles.bottomBarSub}>Peer-to-peer collaboration</Text>
        </View>

        <Pressable
          style={styles.bookButton}
          onPress={() => setIsBookModalVisible(true)}
        >
          <Text style={styles.bookButtonText}>Book Session ➔</Text>
        </Pressable>
      </View>

      {/* Booking Modal */}
      <BookSessionModal
        visible={isBookModalVisible}
        tutor={tutor}
        onClose={() => setIsBookModalVisible(false)}
        onSuccess={(sessionId) => {
          setIsBookModalVisible(false);
          router.push(`/(app)/tutoring/sessions/mine`);
        }}
      />
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
    fontWeight: "800",
    color: "#0D3E02",
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFC",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#64748b",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9FAFC",
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#070D1F",
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: "#0D3E02",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0D3E02",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#FDBF1E",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FDBF1E",
  },
  tutorName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#070D1F",
    marginBottom: 2,
  },
  tutorDept: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAF8",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: "100%",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statItem: {
    alignItems: "center",
  },
  statVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#070D1F",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  headlineText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#334155",
    lineHeight: 20,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0D3E02",
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subjectPill: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  subjectPillText: {
    color: "#0D3E02",
    fontSize: 12,
    fontWeight: "600",
  },
  skillPill: {
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  skillPillText: {
    color: "#854D0E",
    fontSize: 12,
    fontWeight: "600",
  },
  reviewCard: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    marginTop: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#070D1F",
  },
  reviewStars: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  emptyReviewText: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0D3E02",
  },
  bottomBarSub: {
    fontSize: 11,
    color: "#64748b",
  },
  bookButton: {
    backgroundColor: "#0D3E02",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDBF1E",
  },
  bookButtonText: {
    color: "#FDBF1E",
    fontSize: 15,
    fontWeight: "800",
  },
});
