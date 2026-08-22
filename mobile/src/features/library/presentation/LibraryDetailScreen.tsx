import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Button, ScreenContainer, colors, font, spacing, typography } from "../../../core/ui";
import { getLibraryProject, toggleBookmark, toggleUpvote, type LibraryProject } from "../data/libraryApi";

export default function LibraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = Number(id);

  const [project, setProject] = useState<LibraryProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setProject(await getLibraryProject(projectId));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't load this project.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const runAction = async (action: () => Promise<LibraryProject>) => {
    setIsActing(true);
    try {
      setProject(await action());
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading || !project) {
    return (
      <ScreenContainer center back="/(app)/library">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll back="/(app)/library">
      <Text style={styles.title}>{project.title}</Text>
      <Text style={styles.author}>{project.author.full_name} · {project.department}</Text>
      <Text style={styles.abstract}>{project.abstract}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actionRow}>
        <Button
          label={`▲ Upvote (${project.upvote_count})`}
          variant={project.is_upvoted ? "primary" : "ghost"}
          onPress={() => runAction(() => toggleUpvote(project.id))}
          disabled={isActing}
          style={styles.flex1}
        />
        <Button
          label={project.is_bookmarked ? "Bookmarked" : "Bookmark"}
          variant={project.is_bookmarked ? "primary" : "ghost"}
          onPress={() => runAction(() => toggleBookmark(project.id))}
          disabled={isActing}
          style={styles.flex1}
        />
      </View>

      <Text style={styles.hint}>Peer-reviewed by department moderators before publishing.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.size.lg, fontFamily: font.serif, color: colors.ink, lineHeight: 27 },
  author: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  abstract: { fontSize: typography.size.base, fontFamily: font.familyRegular, color: colors.text, lineHeight: 24, marginBottom: spacing.lg },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  flex1: { flex: 1 },
  hint: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted, lineHeight: 18 },
});
