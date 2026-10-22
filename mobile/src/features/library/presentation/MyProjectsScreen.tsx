import { Skeleton } from "../../../core/components/Skeleton";
import { colors as appColors } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  deleteLibraryProject,
  listMyLibraryProjects,
  type LibraryProject,
  type LibraryProjectStatus,
} from "../data/libraryApi";
import { levelBadge } from "./LevelPicker";

const statusConfig: Record<
  LibraryProjectStatus,
  { label: string; bg: string; text: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  pending: {
    label: "Under Review",
    bg: "#FFFBEB",
    text: "#B45309",
    icon: "clock-outline",
  },
  approved: {
    label: "Approved & Live",
    bg: appColors.surfaceMuted,
    text: appColors.primary,
    icon: "check-circle-outline",
  },
  rejected: {
    label: "Revision Needed",
    bg: "#FEF2F2",
    text: "#DC2626",
    icon: "alert-circle-outline",
  },
};

function ProjectSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Skeleton width={90} height={22} borderRadius={8} />
          <Skeleton width={50} height={22} borderRadius={8} />
        </View>
        <Skeleton width={42} height={22} borderRadius={12} />
      </View>
      <Skeleton width="80%" height={18} borderRadius={6} style={{ marginTop: 4 }} />
      <Skeleton width="95%" height={13} borderRadius={4} />
      <Skeleton width="60%" height={13} borderRadius={4} />
      <View style={[styles.actionRow, { borderTopColor: appColors.border, paddingTop: 10, marginTop: 4 }]}>
        <Skeleton width="48%" height={34} borderRadius={8} />
        <Skeleton width="48%" height={34} borderRadius={8} />
      </View>
    </View>
  );
}

export default function MyProjectsScreen() {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<LibraryProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listMyLibraryProjects();
      setProjects(data.results);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const performDelete = async (project: LibraryProject) => {
    setDeletingId(project.id);
    try {
      await deleteLibraryProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch {
      const message = "Couldn't delete this project. Please try again.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (project: LibraryProject) => {
    const message = `"${project.title}" will be permanently removed. This cannot be undone.`;
    if (Platform.OS === "web") {
      if (window.confirm(`Delete this project?\n\n${message}`)) void performDelete(project);
      return;
    }
    Alert.alert("Delete this project?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => performDelete(project) },
    ]);
  };

  return (
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/library")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>My Submitted Projects</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <ProjectSkeletonCard />
          <ProjectSkeletonCard />
          <ProjectSkeletonCard />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(project) => String(project.id)}
          contentContainerStyle={[
            projects.length === 0 ? styles.emptyList : styles.list,
            { paddingBottom: Math.max(insets.bottom + 20, 40) },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="folder-account-outline" size={48} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Submissions Yet</Text>
              <Text style={styles.emptySub}>
                Projects and FYPs you submit for peer-review will be tracked here.
              </Text>
              <Pressable
                style={styles.uploadBtn}
                onPress={() => router.push("/(app)/library/upload" as any)}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>Submit a Project</Text>
              </Pressable>
            </View>
          }
        renderItem={({ item }) => {
          const status = statusConfig[item.status] || statusConfig.pending;
          const level = levelBadge[item.level];

          return (
            <View style={styles.card}>
              <Pressable onPress={() => router.push(`/(app)/library/${item.id}`)}>
                <View style={styles.cardTopRow}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <MaterialCommunityIcons name={status.icon} size={13} color={status.text} style={{ marginRight: 4 }} />
                      <Text style={[styles.statusBadgeText, { color: status.text }]}>{status.label}</Text>
                    </View>
                    {level ? (
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelBadgeText}>{level.label}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.upvoteChip}>
                    <MaterialCommunityIcons name="thumb-up-outline" size={12} color={appColors.primary} style={{ marginRight: 3 }} />
                    <Text style={styles.upvoteText}>{item.upvote_count}</Text>
                  </View>
                </View>

                <Text style={styles.projectTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.projectAbstract} numberOfLines={2}>
                  {item.abstract}
                </Text>
              </Pressable>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => router.push(`/(app)/library/${item.id}/edit` as any)}
                  disabled={deletingId === item.id}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={appColors.primary} />
                  <Text style={styles.actionText}>Edit Details</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => confirmDelete(item)}
                  disabled={deletingId === item.id}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                  <Text style={[styles.actionText, styles.deleteText]}>
                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </Text>
                </Pressable>
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
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  topNavBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
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
    fontSize: 16,
    fontWeight: "800",
    color: appColors.primary,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: appColors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  uploadBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  skeletonContainer: {
    padding: 16,
    gap: 12,
    width: "100%",
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  levelBadge: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
  },
  upvoteChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  upvoteText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: appColors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  projectAbstract: {
    fontSize: 12,
    color: appColors.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.background,
    borderWidth: 1,
    borderColor: appColors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.primary,
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
  },
  deleteText: {
    color: "#DC2626",
  },
});
