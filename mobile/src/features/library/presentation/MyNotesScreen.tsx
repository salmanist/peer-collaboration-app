import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, ScreenContainer, Skeleton, colors, font, spacing, typography, NavClearance } from "../../../core/ui";
import { deleteNote, listMyNotes, type Note } from "../data/notesApi";

function NoteSkeletonCard() {
  return (
    <Card contentStyle={styles.noteCard}>
      <Skeleton style={styles.skeletonTitle} />
      <Skeleton style={styles.skeletonLine} />
      <Skeleton style={styles.skeletonLineShort} />
    </Card>
  );
}

export default function MyNotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listMyNotes();
      setNotes(data.results);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const performDelete = async (note: Note) => {
    setDeletingId(note.id);
    try {
      await deleteNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch {
      const message = "Couldn't delete these notes. Please try again.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (note: Note) => {
    const message = `"${note.title}" will be permanently removed. This can't be undone.`;
    if (Platform.OS === "web") {
      if (window.confirm(`Delete these notes?\n\n${message}`)) void performDelete(note);
      return;
    }
    Alert.alert("Delete these notes?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => performDelete(note) },
    ]);
  };

  return (
    <ScreenContainer style={styles.screen} back="/(app)/library">
      <FlatList
        ListFooterComponent={NavClearance}
        data={notes}
        keyExtractor={(note) => String(note.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.title}>My Notes</Text>}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonList}>
              <NoteSkeletonCard />
              <NoteSkeletonCard />
              <NoteSkeletonCard />
            </View>
          ) : (
            <EmptyState icon="note-text-outline" title="No notes shared yet" subtitle="Notes you share will show up here." />
          )
        }
        renderItem={({ item }) => (
          <Card contentStyle={styles.noteCard}>
            <Pressable onPress={() => router.push(`/(app)/library/notes/${item.id}`)}>
              <View style={styles.noteRow}>
                <Text style={styles.noteTitle} numberOfLines={2}>{item.title}</Text>
                {item.semester ? <Badge label={item.semester} tone="secondary" /> : null}
              </View>
              <Text style={styles.noteCourse}>{item.course_title} ({item.course})</Text>
              <Text style={styles.noteMeta}>▲ {item.upvote_count}</Text>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => router.push(`/(app)/library/notes/${item.id}/edit`)}
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
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  listContent: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginBottom: spacing.xs },
  noteCard: { gap: spacing.xs },
  noteRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  noteTitle: { flex: 1, fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  noteCourse: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
  noteMeta: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  actionRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs },
  actionText: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textSecondary },
  deleteText: { color: colors.danger },
  skeletonList: { gap: spacing.md },
  skeletonTitle: { width: "60%", height: 16 },
  skeletonLine: { width: "90%", height: 11, marginTop: spacing.xs },
  skeletonLineShort: { width: "70%", height: 11 },
});
