import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
import { SkeletonList, TutorCardSkeleton } from "../../../core/components/Skeleton";
import { ModuleOptionsMenu, type ModuleDropdownItem } from "../../../core/components/ModuleOptionsMenu";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { fetchTutors } from "../data/tutoringApi";
import { useTutoringNotificationStore } from "../tutoringNotifications";
import { POPULAR_SKILLS, POPULAR_SUBJECTS, type ProfileType, type TutorProfile } from "../tutoring";

export function TutorDiscoveryFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const { hasActiveTutorProfile, pollSummary } = useTutoringNotificationStore();
  const pendingRequestsCount = useTutoringNotificationStore((state) => state.pendingRequestsCount);

  const dropdownItems: ModuleDropdownItem[] = useMemo(
    () => [
      {
        key: "my_sessions",
        label: "My Tutoring Sessions",
        subtitle: "View upcoming & past sessions",
        icon: "calendar-clock",
        iconColor: "#0D3E02",
        badgeCount: pendingRequestsCount,
        onPress: () => router.push("/(app)/tutoring/sessions" as any),
      },
      {
        key: "tutor_profile",
        label: hasActiveTutorProfile ? "Edit Tutor Profile" : "Become a Peer Tutor",
        subtitle: hasActiveTutorProfile ? "Update your tutoring subjects & bio" : "Offer academic help to peers",
        icon: "account-edit-outline",
        iconColor: "#0284C7",
        isAction: true,
        onPress: () => router.push("/(app)/tutoring/setup" as any),
      },
    ],
    [pendingRequestsCount, hasActiveTutorProfile]
  );

  // In-Memory DataStore
  const { tutors: cachedTutors, setTutors: setStoreTutors } = useDataStore();

  const [tutors, setTutors] = useState<TutorProfile[]>(() => cachedTutors || []);
  const [isLoading, setIsLoading] = useState(() => !(cachedTutors && cachedTutors.length > 0));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "tutor" | "mentor">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else if (!tutors.length && (!cachedTutors || cachedTutors.length === 0)) setIsLoading(true);

      try {
        const params: any = {};
        if (activeTab === "tutor") params.profile_type = "tutor";
        if (activeTab === "mentor") params.profile_type = "mentor";
        if (selectedTag) {
          if (POPULAR_SUBJECTS.includes(selectedTag)) params.subject = selectedTag;
          else params.skill = selectedTag;
        }
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const data = await fetchTutors(params);
        setTutors(data.results || []);

        if (activeTab === "all" && !selectedTag && !searchQuery.trim()) {
          setStoreTutors(data.results || []);
        }
      } catch (err) {
        console.error("Error fetching tutors:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, selectedTag, searchQuery, tutors.length, setStoreTutors],
  );

  useEffect(() => {
    void loadData();
  }, [activeTab, selectedTag]);

  useFocusEffect(
    useCallback(() => {
      // Re-fetch in background without showing full screen loader
      void loadData(true);
    }, [loadData]),
  );

  const handleTabChange = (tab: "all" | "tutor" | "mentor") => {
    setActiveTab(tab);
    setSelectedTag(null);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  const filteredTutors = useMemo(() => {
    let list = tutors;
    if (activeTab === "tutor") {
      list = list.filter((t) => t.profile_type === "tutor" || t.profile_type === "both");
    } else if (activeTab === "mentor") {
      list = list.filter((t) => t.profile_type === "mentor" || t.profile_type === "both");
    }

    if (selectedTag) {
      const tagLower = selectedTag.toLowerCase();
      const parts = tagLower.split(/[/(),]/).map((p) => p.trim()).filter(Boolean);
      list = list.filter((t) => {
        const subjects = (t.subjects || []).map((s) => s.toLowerCase());
        const skills = (t.skills || []).map((s) => s.toLowerCase());
        const combined = [...subjects, ...skills, (t.headline || "").toLowerCase(), (t.bio || "").toLowerCase()];
        return parts.some((part) => combined.some((item) => item.includes(part)));
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((t) =>
        (t.tutor_name || "").toLowerCase().includes(q) ||
        (t.headline || "").toLowerCase().includes(q) ||
        (t.bio || "").toLowerCase().includes(q) ||
        (t.subjects || []).some((s) => s.toLowerCase().includes(q)) ||
        (t.skills || []).some((s) => s.toLowerCase().includes(q))
      );
    }

    return list;
  }, [tutors, activeTab, selectedTag, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Compact Top App Bar */}
      <View style={[styles.compactTopNav, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Text style={styles.compactNavTitle}>Peer Tutoring</Text>
        <ModuleOptionsMenu
          items={dropdownItems}
          hasNotification={pendingRequestsCount > 0}
        />
      </View>

      {/* Search Row */}
      <View style={styles.actionSearchRow}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tutor, subject (DSA, OOP)..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => loadData()}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#94a3b8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters (Subjects/Skills Pills) */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsScroll}
        >
          {[...POPULAR_SUBJECTS, ...POPULAR_SKILLS].map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <Pressable
                key={tag}
                style={[styles.tagPill, isSelected && styles.tagPillActive]}
                onPress={() => handleTagToggle(tag)}
              >
                <Text style={[styles.tagPillText, isSelected && styles.tagPillTextActive]}>
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Tutors List */}
      {isLoading ? (
        <SkeletonList
          count={4}
          renderItem={() => <TutorCardSkeleton />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 50, 70) },
          ]}
        />
      ) : (
        <FlatList
          data={filteredTutors}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 50, 70) },
          ]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="school-outline" size={48} color="#64748b" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No tutors or mentors found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or subject filters.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isTutor = item.profile_type === "tutor" || item.profile_type === "both";
            const isMentor = item.profile_type === "mentor" || item.profile_type === "both";
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/(app)/tutoring/tutors/${item.id}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <MaterialCommunityIcons name="account" size={24} color="#FDBF1E" />
                  </View>
                  <View style={styles.tutorHeaderInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.tutorName} numberOfLines={1}>{item.tutor_name}</Text>
                      {Number(item.average_rating) > 0 ? (
                        <View style={styles.ratingBadge}>
                          <MaterialCommunityIcons name="star" size={12} color="#FDBF1E" style={{ marginRight: 2 }} />
                          <Text style={styles.ratingText}>{Number(item.average_rating).toFixed(1)}</Text>
                          <Text style={styles.reviewsCountText}>({item.total_reviews})</Text>
                        </View>
                      ) : (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.tutorDept}>
                      {item.tutor_department || "LGU Student"}
                      {item.tutor_enrollment_year ? ` • ${item.tutor_enrollment_year}` : ""}
                    </Text>
                  </View>
                </View>

                {/* Headline */}
                {item.headline ? (
                  <Text style={styles.headline} numberOfLines={2}>
                    {item.headline}
                  </Text>
                ) : null}

                {/* Badges for subjects / skills */}
                <View style={styles.badgesRow}>
                  {isTutor && item.subjects.slice(0, 3).map((sub, idx) => (
                    <View key={`sub-${idx}`} style={styles.subjectBadge}>
                      <MaterialCommunityIcons name="book-outline" size={11} color="#0D3E02" style={{ marginRight: 3 }} />
                      <Text style={styles.subjectBadgeText}>{sub}</Text>
                    </View>
                  ))}
                  {isMentor && item.skills.slice(0, 3).map((skill, idx) => (
                    <View key={`skill-${idx}`} style={styles.skillBadge}>
                      <MaterialCommunityIcons name="briefcase-outline" size={11} color="#92400E" style={{ marginRight: 3 }} />
                      <Text style={styles.skillBadgeText}>{skill}</Text>
                    </View>
                  ))}
                </View>

                {/* Card Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.roleTagWrap}>
                    <MaterialCommunityIcons
                      name={item.profile_type === "mentor" ? "briefcase-outline" : "school-outline"}
                      size={13}
                      color="#0D3E02"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.roleTagText}>
                      {item.profile_type === "both"
                        ? "Tutor & Mentor"
                        : item.profile_type === "mentor"
                        ? "Academic Mentor"
                        : "Peer Tutor"}
                    </Text>
                  </View>
                  <View style={styles.bookButton}>
                    <Text style={styles.bookButtonText}>View Profile</Text>
                    <MaterialCommunityIcons name="arrow-right" size={14} color="#0D3E02" style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  compactTopNav: {
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 7,
  },
  mySessionsHeaderBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    justifyContent: "center",
    alignItems: "center",
  },
  hamburgerBtn: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hamburgerLine: {
    width: 17,
    height: 2,
    backgroundColor: "#0D3E02",
    borderRadius: 2,
  },
  compactNavTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.3,
  },
  avatarBtn: {
    borderRadius: 20,
    padding: 2,
    borderWidth: 1.5,
    borderColor: "#FDBF1E",
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0D3E02",
    justifyContent: "center",
    alignItems: "center",
  },
  actionSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 11 : 7,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
  },
  filtersWrapper: {
    paddingVertical: 12,
  },
  tagsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagPill: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  tagPillActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tagPillTextActive: {
    color: "#FDBF1E",
    fontWeight: "800",
  },
  listContent: {
    padding: 16,
    paddingTop: 2,
    gap: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 40,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  card: {
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
    gap: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#0D3E02",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FDBF1E",
  },
  avatarText: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FDBF1E",
  },
  tutorHeaderInfo: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tutorName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D3E02",
  },
  reviewsCountText: {
    fontSize: 10,
    color: "#92400E",
    fontWeight: "600",
  },
  newBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D3E02",
  },
  tutorDept: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  headline: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    marginBottom: 12,
    fontWeight: "500",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  subjectBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D3E02",
  },
  skillBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  skillBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  roleTagWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roleTagText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0D3E02",
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bookButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D3E02",
  },
});

export default TutorDiscoveryFeedScreen;
