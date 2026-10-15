import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Button, ScreenContainer, colors, font, spacing, typography } from "../../../core/ui";
import { getLibraryProject, toggleBookmark, toggleUpvote, type LibraryProject } from "../data/libraryApi";
import { levelBadge } from "./LevelPicker";

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

  const level = levelBadge[project.level];

  return (
    <ScreenContainer scroll back="/(app)/library">
      <View style={styles.titleRow}>
        <Text style={styles.title}>{project.title}</Text>
        {level && <Badge label={level.label} tone={level.tone} />}
      </View>
      <Text style={styles.author}>{project.author.full_name} · {project.department}</Text>
      <Text style={styles.abstract}>{project.abstract}</Text>

      {project.github_link ? (
        <Pressable onPress={() => Linking.openURL(project.github_link)}>
          <Text style={styles.githubLink}>{project.github_link}</Text>
        </Pressable>
      ) : null}

      {project.files.length > 0 && (
        <View style={styles.filesSection}>
          {project.files.map((f) => (
            <Pressable key={f.id} onPress={() => Linking.openURL(f.file)}>
              <Text style={styles.fileLink} numberOfLines={1}>{f.file.split("/").pop()}</Text>
            </Pressable>
          ))}
        </View>
      )}

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
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  title: { flex: 1, fontSize: typography.size.lg, fontFamily: font.serif, color: colors.ink, lineHeight: 27 },
  author: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  abstract: { fontSize: typography.size.base, fontFamily: font.familyRegular, color: colors.text, lineHeight: 24, marginBottom: spacing.md },
  githubLink: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.primaryContainer, marginBottom: spacing.lg, textDecorationLine: "underline" },
  filesSection: { gap: spacing.xs, marginBottom: spacing.lg },
  fileLink: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.primaryContainer, textDecorationLine: "underline" },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  flex1: { flex: 1 },
  hint: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted, lineHeight: 18 },
});
