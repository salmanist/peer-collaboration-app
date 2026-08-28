import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SkeletonList, CollaborationCardSkeleton } from "../../../core/components/Skeleton";
import { useSessionStore } from "../../../core/auth/session";
import {
  deleteCollaboration,
  fetchCollaborations,
  updateCollaboration,
} from "../data/tutoringApi";

import type { CollaborationRequest } from "../tutoring";

const COLLAB_CATEGORIES = [
  "All",
  "Final Year Project (FYP)",
  "Semester Project",
  "Hackathon & Competitions",
  "Research & Study",
];

export function CollaborationBoardScreen() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);


  const [collaborations, setCollaborations] = useState<CollaborationRequest[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else if (!collaborations.length) setIsLoading(true);

      try {
        const params: any = {};
        if (selectedCategory !== "All") params.category = selectedCategory;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const data = await fetchCollaborations(params);
        setCollaborations(data.results || []);
      } catch (err) {
        console.error("Error loading collaborations:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedCategory, searchQuery],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async (item: CollaborationRequest) => {
    const nextStatus = item.status === "open" ? "closed" : "open";
    try {
      await updateCollaboration(item.id, { status: nextStatus });
      loadData();
    } catch (err) {
      Alert.alert("Error", "Could not update status.");
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this collaboration request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCollaboration(id);
              loadData();
            } catch {
              Alert.alert("Error", "Could not delete request.");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Project Collaborations</Text>
          <Text style={styles.subtitle}>Find teammates, project partners, and skill collaborators</Text>
        </View>
        <Pressable
          style={styles.postBtn}
          onPress={() => router.push("/(app)/tutoring/collaborations/create")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons name="plus" size={14} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.postBtnText}>Post Request</Text>
          </View>
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by project name, skills, or tech stack..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={() => loadData()}
        />
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={COLLAB_CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoriesScroll}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <Pressable
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <SkeletonList
          count={4}
          renderItem={() => <CollaborationCardSkeleton />}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={collaborations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-group-outline" size={48} color="#64748b" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No collaboration requests yet</Text>
              <Text style={styles.emptySubtitle}>
                Looking for a teammate for your FYP or class assignment? Tap "Post Request" to find peers!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOwner = item.creator_id === user?.id;

            return (
              <View style={styles.collabCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.collabTitle}>{item.title}</Text>
                    <Text style={styles.creatorMeta}>
                      Posted by <Text style={{ fontWeight: "700" }}>{item.creator_name}</Text>
                      {item.creator_department ? ` • ${item.creator_department}` : ""}
                    </Text>
                  </View>

                  <View style={[styles.categoryBadge]}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.description}>{item.description}</Text>

                {/* Required Skills */}
                {item.required_skills && item.required_skills.length > 0 && (
                  <View style={styles.skillsRow}>
                    <Text style={styles.skillsLabel}>Looking for:</Text>
                    {item.required_skills.map((skill, idx) => (
                      <View key={idx} style={styles.skillChip}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <MaterialCommunityIcons name="lightning-bolt" size={12} color="#D97706" style={{ marginRight: 3 }} />
                          <Text style={styles.skillChipText}>{skill}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Contact Footer */}
                <View style={styles.cardFooter}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons name="email-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.contactInfo}>
                      {item.contact_info || item.creator_email}
                    </Text>
                  </View>

                  {isOwner && (
                    <View style={styles.ownerActions}>
                      <Pressable
                        style={[styles.statusToggleBtn, item.status === "open" ? styles.closeBtn : styles.reopenBtn]}
                        onPress={() => handleToggleStatus(item)}
                      >
                        <Text style={styles.statusToggleText}>
                          {item.status === "open" ? "Mark Closed" : "Reopen"}
                        </Text>
                      </Pressable>

                      <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  postBtn: {
    backgroundColor: "#FDBF1E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  postBtnText: {
    color: "#0D3E02",
    fontSize: 12,
    fontWeight: "900",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
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
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
  },
  categoriesRow: {
    marginBottom: 10,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryPillActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  categoryPillTextActive: {
    color: "#FDBF1E",
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#64748b",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 14,
  },
  collabCard: {
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
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  collabTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  creatorMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  description: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 10,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  skillsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginRight: 2,
  },
  skillChip: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  skillChipText: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  contactInfo: {
    fontSize: 12,
    color: "#1d4ed8",
    fontWeight: "500",
  },
  ownerActions: {
    flexDirection: "row",
    gap: 6,
  },
  statusToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeBtn: {
    backgroundColor: "#f1f5f9",
  },
  reopenBtn: {
    backgroundColor: "#dbeafe",
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#b91c1c",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
});
