import { colors as appColors } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getNote, toggleNoteBookmark, toggleNoteUpvote, type Note } from "../data/notesApi";

export default function NoteDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = Number(id);

  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
      <View style={styles.rootContainer}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/library")}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
          </Pressable>
          <Text style={styles.topNavTitle}>Note Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <LoadingSkeleton variant="detail" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/library")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>Note Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 90, 110) },
        ]}
      >
        {/* Main Note Header Card */}
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            {note.semester ? (
              <View style={styles.semesterBadge}>
                <Text style={styles.semesterBadgeText}>{note.semester}</Text>
              </View>
            ) : null}
            <View style={styles.courseBadge}>
              <Text style={styles.courseBadgeText}>{note.course}</Text>
            </View>
            <View style={styles.deptBadge}>
              <Text style={styles.deptBadgeText}>{note.department}</Text>
            </View>
          </View>

          <Text style={styles.title}>{note.title}</Text>
          {note.course_title ? <Text style={styles.subtitle}>{note.course_title}</Text> : null}

          <View style={styles.authorSection}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="account" size={18} color={appColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{note.author.full_name}</Text>
              <Text style={styles.authorDept}>{note.department} Student</Text>
            </View>
          </View>
        </View>

        {/* Note Description / Summary Card */}
        {note.description ? (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="text-box-outline" size={18} color={appColors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeaderTitle}>Description</Text>
            </View>
            <Text style={styles.descriptionText}>{note.description}</Text>
          </View>
        ) : null}

        {/* Attached Files Card */}
        {note.files.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="paperclip" size={18} color={appColors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeaderTitle}>Attached Documents / PDFs</Text>
            </View>

            <View style={styles.fileList}>
              {note.files.map((f) => (
                <Pressable
                  key={f.id}
                  style={styles.fileRow}
                  onPress={() => Linking.openURL(f.file)}
                >
                  <View style={styles.fileIconWrap}>
                    <MaterialCommunityIcons name="file-pdf-box" size={22} color="#DC2626" />
                  </View>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {f.file.split("/").pop()}
                  </Text>
                  <MaterialCommunityIcons name="download" size={18} color={appColors.primary} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Print Option Link Card */}
        <Pressable
          style={[styles.card, styles.linkCard]}
          onPress={() => router.push("/(app)/printing/new" as any)}
        >
          <View style={styles.linkLeft}>
            <View style={styles.linkIconCircle}>
              <MaterialCommunityIcons name="printer-outline" size={20} color={appColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkLabel}>Need these notes printed?</Text>
              <Text style={styles.linkSub}>Order a print job at the campus Print Centre</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={appColors.textSecondary} />
        </Pressable>

        {error && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
        <Pressable
          style={[
            styles.actionButton,
            note.is_upvoted ? styles.actionButtonActive : styles.actionButtonOutline,
          ]}
          onPress={() => runAction(() => toggleNoteUpvote(note.id))}
          disabled={isActing}
        >
          <MaterialCommunityIcons
            name={note.is_upvoted ? "thumb-up" : "thumb-up-outline"}
            size={18}
            color={note.is_upvoted ? "#FDBF1E" : appColors.primary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.actionButtonText,
              note.is_upvoted ? styles.actionButtonTextActive : styles.actionButtonTextOutline,
            ]}
          >
            {note.is_upvoted ? `Upvoted (${note.upvote_count})` : `Upvote (${note.upvote_count})`}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            note.is_bookmarked ? styles.actionButtonActive : styles.actionButtonOutline,
          ]}
          onPress={() => runAction(() => toggleNoteBookmark(note.id))}
          disabled={isActing}
        >
          <MaterialCommunityIcons
            name={note.is_bookmarked ? "bookmark" : "bookmark-outline"}
            size={18}
            color={note.is_bookmarked ? "#FDBF1E" : appColors.primary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.actionButtonText,
              note.is_bookmarked ? styles.actionButtonTextActive : styles.actionButtonTextOutline,
            ]}
          >
            {note.is_bookmarked ? "Bookmarked" : "Bookmark"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
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
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  semesterBadge: {
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  semesterBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
  courseBadge: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  courseBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.primary,
  },
  deptBadge: {
    backgroundColor: appColors.border,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deptBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: appColors.text,
    lineHeight: 25,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  authorSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  authorName: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  authorDept: {
    fontSize: 12,
    color: appColors.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 21,
    color: appColors.textSecondary,
  },
  fileList: {
    gap: 8,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 10,
  },
  fileIconWrap: {
    width: 32,
    height: 32,


    alignItems: "center",
    justifyContent: "center",
  },
  fileName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: appColors.text,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  linkIconCircle: {
    width: 36,
    height: 36,


    alignItems: "center",
    justifyContent: "center",
  },
  linkLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  linkSub: {
    fontSize: 11,
    color: appColors.textSecondary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: "row",
    gap: 12,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonActive: {
    backgroundColor: appColors.primary,
  },
  actionButtonOutline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: appColors.primary,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  actionButtonTextActive: {
    color: "#FFFFFF",
  },
  actionButtonTextOutline: {
    color: appColors.primary,
  },
});
