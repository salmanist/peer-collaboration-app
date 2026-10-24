import { Skeleton } from "../../../core/components/Skeleton";
import { colors as appColors, headerGrow } from "../../../core/ui/theme";
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

import { deleteNote, listMyNotes, type Note } from "../data/notesApi";

function NoteSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Skeleton width={75} height={22} borderRadius={8} />
          <Skeleton width={60} height={22} borderRadius={8} />
        </View>
        <Skeleton width={42} height={22} borderRadius={12} />
      </View>
      <Skeleton width="85%" height={18} borderRadius={6} style={{ marginTop: 4 }} />
      <Skeleton width="92%" height={13} borderRadius={4} />
      <Skeleton width="55%" height={13} borderRadius={4} />
      <View style={[styles.actionRow, { borderTopColor: appColors.border, paddingTop: 10, marginTop: 4 }]}>
        <Skeleton width="48%" height={34} borderRadius={8} />
        <Skeleton width="48%" height={34} borderRadius={8} />
      </View>
    </View>
  );
}

export default function MyNotesScreen() {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listMyNotes();
      setNotes(data.results);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
    const message = `"${note.title}" will be permanently removed. This cannot be undone.`;
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
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/library")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
        </Pressable>
        <Text style={styles.topNavTitle}>My Shared Notes</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <NoteSkeletonCard />
          <NoteSkeletonCard />
          <NoteSkeletonCard />
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(note) => String(note.id)}
          contentContainerStyle={[
            notes.length === 0 ? styles.emptyList : styles.list,
            { paddingBottom: Math.max(insets.bottom + 20, 40) },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="note-text-outline" size={48} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Notes Shared Yet</Text>
              <Text style={styles.emptySub}>
                Notes you share with other students will appear here.
              </Text>
              <Pressable
                style={styles.uploadBtn}
                onPress={() => router.push("/(app)/library/notes/upload" as any)}
              >
                <MaterialCommunityIcons name="plus" size={18} color={appColors.white} style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>Share Notes</Text>
              </Pressable>
            </View>
          }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => router.push(`/(app)/library/notes/${item.id}`)}>
              <View style={styles.cardTopRow}>
                <View style={styles.badgeRow}>
                  {item.semester ? (
                    <View style={styles.semesterBadge}>
                      <Text style={styles.semesterBadgeText}>{item.semester}</Text>
                    </View>
                  ) : null}
                  <View style={styles.courseBadge}>
                    <Text style={styles.courseBadgeText}>{item.course}</Text>
                  </View>
                </View>
                <View style={styles.upvoteChip}>
                  <MaterialCommunityIcons name="thumb-up-outline" size={12} color={appColors.primary} style={{ marginRight: 3 }} />
                  <Text style={styles.upvoteText}>{item.upvote_count}</Text>
                </View>
              </View>

              <Text style={styles.noteTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.noteCourse}>
                {item.course_title ? `${item.course_title} · ` : ""}{item.department}
              </Text>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => router.push(`/(app)/library/notes/${item.id}/edit` as any)}
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
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={appColors.danger} />
                <Text style={[styles.actionText, styles.deleteText]}>
                  {deletingId === item.id ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
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
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    backgroundColor: appColors.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 8 + headerGrow,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: appColors.headerBg,
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
    fontSize: 16,
    fontWeight: "800",
    color: appColors.onHeader,
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
    color: appColors.white,
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
    backgroundColor: appColors.white,
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
  semesterBadge: {
    backgroundColor: appColors.amber50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  semesterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.amber700,
  },
  courseBadge: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  courseBadgeText: {
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
  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: appColors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  noteCourse: {
    fontSize: 12,
    color: appColors.textSecondary,
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
    backgroundColor: appColors.red50,
    borderColor: appColors.dangerBg,
  },
  deleteText: {
    color: appColors.danger,
  },
});
