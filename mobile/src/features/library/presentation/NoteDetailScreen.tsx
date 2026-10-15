import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Button, ScreenContainer, colors, font, spacing, typography } from "../../../core/ui";
import { getNote, toggleNoteBookmark, toggleNoteUpvote, type Note } from "../data/notesApi";

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = Number(id);

  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setNote(await getNote(noteId));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't load these notes.");
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const runAction = async (action: () => Promise<Note>) => {
    setIsActing(true);
    try {
      setNote(await action());
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading || !note) {
    return (
      <ScreenContainer center back="/(app)/library">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll back="/(app)/library">
      <View style={styles.titleRow}>
        <Text style={styles.title}>{note.title}</Text>
        {note.semester ? <Badge label={note.semester} tone="secondary" /> : null}
      </View>
      <Text style={styles.meta}>{note.author.full_name} · {note.course_title} ({note.course}) · {note.department}</Text>
      {note.description ? <Text style={styles.description}>{note.description}</Text> : null}

      {note.files.length > 0 && (
        <View style={styles.filesSection}>
          {note.files.map((f) => (
            <Pressable key={f.id} onPress={() => Linking.openURL(f.file)}>
              <Text style={styles.fileLink} numberOfLines={1}>{f.file.split("/").pop()}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actionRow}>
        <Button
          label={`▲ Upvote (${note.upvote_count})`}
          variant={note.is_upvoted ? "primary" : "ghost"}
          onPress={() => runAction(() => toggleNoteUpvote(note.id))}
          disabled={isActing}
          style={styles.flex1}
        />
        <Button
          label={note.is_bookmarked ? "Bookmarked" : "Bookmark"}
          variant={note.is_bookmarked ? "primary" : "ghost"}
          onPress={() => runAction(() => toggleNoteBookmark(note.id))}
          disabled={isActing}
          style={styles.flex1}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  title: { flex: 1, fontSize: typography.size.lg, fontFamily: font.serif, color: colors.ink, lineHeight: 27 },
  meta: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  description: { fontSize: typography.size.base, fontFamily: font.familyRegular, color: colors.text, lineHeight: 24, marginBottom: spacing.md },
  filesSection: { gap: spacing.xs, marginBottom: spacing.lg },
  fileLink: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.primaryContainer, textDecorationLine: "underline" },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  flex1: { flex: 1 },
});
