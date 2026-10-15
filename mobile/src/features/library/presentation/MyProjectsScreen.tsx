import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, ScreenContainer, Skeleton, colors, font, spacing, typography, NavClearance } from "../../../core/ui";
import { deleteLibraryProject, listMyLibraryProjects, type LibraryProject, type LibraryProjectStatus } from "../data/libraryApi";
import { levelBadge } from "./LevelPicker";

const statusBadge: Record<LibraryProjectStatus, { label: string; tone: "warning" | "success" | "danger" }> = {
  pending: { label: "Pending review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

function ProjectSkeletonCard() {
  return (
    <Card contentStyle={styles.projectCard}>
      <Skeleton style={styles.skeletonTitle} />
      <Skeleton style={styles.skeletonLine} />
      <Skeleton style={styles.skeletonLineShort} />
    </Card>
  );
}

export default function MyProjectsScreen() {
  const [projects, setProjects] = useState<LibraryProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listMyLibraryProjects();
      setProjects(data.results);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const performDelete = async (project: LibraryProject) => {
    setDeletingId(project.id);
    try {
      await deleteLibraryProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch {
      const message = "Couldn't delete this project. Please try again.";
      // react-native-web's Alert.alert is a no-op stub (does nothing at all, no
      // dialog, no callback) - every alert on this screen needs the web branch.
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (project: LibraryProject) => {
    const message = `"${project.title}" will be permanently removed. This can't be undone.`;
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
    <ScreenContainer style={styles.screen} back="/(app)/library">
      <FlatList
        ListFooterComponent={NavClearance}
        data={projects}
        keyExtractor={(project) => String(project.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.title}>My Projects</Text>}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonList}>
              <ProjectSkeletonCard />
              <ProjectSkeletonCard />
              <ProjectSkeletonCard />
            </View>
          ) : (
            <EmptyState icon="folder-account-outline" title="No submissions yet" subtitle="Projects you submit will show up here." />
          )
        }
        renderItem={({ item }) => {
          const status = statusBadge[item.status];
          const level = levelBadge[item.level];
          return (
            <Card contentStyle={styles.projectCard}>
              <Pressable onPress={() => router.push(`/(app)/library/${item.id}`)}>
                <View style={styles.projectRow}>
                  <Text style={styles.projectTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.badgeGroup}>
                    {level && <Badge label={level.label} tone={level.tone} />}
                    <Badge label={status.label} tone={status.tone} />
                  </View>
                </View>
                <Text style={styles.projectAbstract} numberOfLines={2}>{item.abstract}</Text>
                <Text style={styles.projectMeta}>▲ {item.upvote_count}</Text>
              </Pressable>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => router.push(`/(app)/library/${item.id}/edit`)}
                  disabled={deletingId === item.id}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.actionText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => confirmDelete(item)}
                  disabled={deletingId === item.id}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  listContent: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginBottom: spacing.xs },
  projectCard: { gap: spacing.xs },
  projectRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  badgeGroup: { flexDirection: "row", gap: spacing.xs, flexShrink: 0 },
  projectTitle: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink, flexShrink: 1 },
  projectAbstract: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary, lineHeight: 20 },
  projectMeta: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  actionRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs },
  actionText: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textSecondary },
  deleteText: { color: colors.danger },
  skeletonList: { gap: spacing.md },
  skeletonTitle: { width: "60%", height: 16 },
  skeletonLine: { width: "90%", height: 11, marginTop: spacing.xs },
  skeletonLineShort: { width: "70%", height: 11 },
});
