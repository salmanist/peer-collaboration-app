import { cleanSampleText } from "../../../core/utils/cleanText";
import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSessionStore } from "../../../core/auth/session";
import { fetchTutor } from "../data/tutoringApi";
import { TutorProfileSkeleton } from "../../../core/components/Skeleton";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { BookSessionModal } from "./BookSessionModal";
import type { TutorProfile } from "../tutoring";

// Department code formatter (e.g. BSCS, BSSE, BSIT)
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

export function TutorProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tutorId = Number(id);
  const { tutors } = useDataStore();
  const currentUser = useSessionStore((state) => state.user);

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
            onPress={() => goBack("/(app)/tutoring")}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
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
        <MaterialCommunityIcons name="magnify" size={48} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
        <Text style={styles.errorTitle}>Tutor not found</Text>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => goBack("/(app)/tutoring")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
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
          onPress={() => goBack("/(app)/tutoring")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
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
            <MaterialCommunityIcons name="account" size={44} color={appColors.primary} />
          </View>

          <Text style={styles.tutorName}>{cleanSampleText(tutor.tutor_name)}</Text>
          <Text style={styles.tutorDept}>
            {formatDepartmentCode(tutor.tutor_department)}
            {tutor.tutor_enrollment_year ? ` • ${tutor.tutor_enrollment_year}` : ""}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              {Number(tutor.average_rating) > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="star" size={14} color={appColors.gold} style={{ marginRight: 2 }} />
                  <Text style={styles.statVal}>{Number(tutor.average_rating).toFixed(1)}</Text>
                </View>
              ) : (
                <Text style={styles.statVal}>NEW</Text>
              )}
              <Text style={styles.statLabel} numberOfLines={1}>{tutor.total_reviews} Reviews</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statVal} numberOfLines={1}>
                {formatDepartmentCode(tutor.tutor_department)}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Department</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statVal} numberOfLines={1}>
                {tutor.profile_type === "tutor" ? "Tutor" : tutor.profile_type === "mentor" ? "Mentor" : "Both"}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>Role</Text>
            </View>
          </View>
        </View>

        {/* Headline */}
        <View style={styles.section}>
          <Text style={styles.headlineText}>"{cleanSampleText(tutor.headline)}"</Text>
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
              <MaterialCommunityIcons name="book-open-page-variant" size={16} color={appColors.primary} style={{ marginRight: 6 }} />
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
              <MaterialCommunityIcons name="briefcase-outline" size={16} color={appColors.icon} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Practical Skills & Mentorship</Text>
            </View>
            <Text style={{ color: appColors.textSecondary, lineHeight: 22 }}>{tutor.skills.join(" · ")}</Text>
          </View>
        )}

        {/* Availability */}
        {tutor.availability ? (
          <View style={styles.section}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <MaterialCommunityIcons name="calendar-clock-outline" size={16} color={appColors.primary} style={{ marginRight: 6 }} />
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
                      <MaterialCommunityIcons key={i} name="star" size={14} color={appColors.gold} />
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
            {tutor?.user_id === currentUser?.id ? "This is your profile" : "Academic Session"}
          </Text>
          <Text style={styles.bottomBarSub}>Peer-to-peer collaboration</Text>
        </View>

        {tutor?.user_id === currentUser?.id ? (
          // You can't book yourself: send tutors to edit their own profile instead.
          <Pressable style={styles.bookButton} onPress={() => router.push("/(app)/tutoring/setup" as any)}>
            <Text style={styles.bookButtonText}>Edit my profile</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.bookButton} onPress={() => setIsBookModalVisible(true)}>
            <Text style={styles.bookButtonText}>Book Session ➔</Text>
          </Pressable>
        )}
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
    backgroundColor: appColors.background,
  },
  topNavBar: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    backgroundColor: appColors.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 8 + headerGrow,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appColors.headerControlBg,
    borderWidth: 1,
    borderColor: appColors.headerControlBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: appColors.onHeader,
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
    backgroundColor: appColors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: appColors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: appColors.background,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: appColors.text,
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: appColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: appColors.white,
    fontWeight: "700",
  },
  profileCard: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.border,
    marginBottom: 16,
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: appColors.sageTint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: appColors.gold,
  },
  tutorName: {
    fontSize: 20,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 2,
  },
  tutorDept: {
    fontSize: 13,
    color: appColors.textSecondary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    width: "100%",
    borderWidth: 1,
    borderColor: appColors.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  statVal: {
    fontSize: 14,
    fontWeight: "800",
    color: appColors.text,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 11,
    color: appColors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: appColors.border,
  },
  section: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    marginBottom: 14,
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  headlineText: {
    fontSize: 14,
    fontStyle: "italic",
    color: appColors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: appColors.primary,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 13,
    color: appColors.textSecondary,
    lineHeight: 19,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subjectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  subjectPillText: {
    color: appColors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  skillPill: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: appColors.amber200,
  },
  skillPillText: {
    color: appColors.yellow800,
    fontSize: 12,
    fontWeight: "600",
  },
  reviewCard: {
    borderTopWidth: 1,
    borderTopColor: appColors.border,
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
    color: appColors.text,
  },
  reviewStars: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 12,
    color: appColors.textSecondary,
    lineHeight: 17,
  },
  emptyReviewText: {
    fontSize: 12,
    color: appColors.textMuted,
    fontStyle: "italic",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: appColors.white,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.primary,
  },
  bottomBarSub: {
    fontSize: 11,
    color: appColors.textSecondary,
  },
  bookButton: {
    backgroundColor: appColors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.gold,
  },
  bookButtonText: {
    color: appColors.gold,
    fontSize: 15,
    fontWeight: "800",
  },
});
