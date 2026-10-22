import { colors as appColors } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CoursePicker } from "../../../core/ui/CoursePicker";
import type { AcademicCourse } from "../../../core/network/coursesApi";
import { usePersistentCache } from "../../../core/data/PersistentCache";
import { listCourses } from "../../../core/network/coursesApi";
import { getNote, updateNote } from "../data/notesApi";

export default function EditNoteScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = Number(id);

  const { data: courses } = usePersistentCache<AcademicCourse[]>("courses", listCourses);

  const [title, setTitle] = useState("");
  const [course, setCourse] = useState<AcademicCourse | null>(null);
  const [courseCode, setCourseCode] = useState<string | null>(null);
  const [semester, setSemester] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  useEffect(() => {
    getNote(noteId)
      .then((note) => {
        setTitle(note.title);
        setSemester(note.semester);
        setDescription(note.description);
        setCourseCode(note.course);
      })
      .catch(() => setError("Couldn't load these notes."))
      .finally(() => setIsLoading(false));
  }, [noteId]);

  useEffect(() => {
    if (!courseCode || !courses) return;
    const match = courses.find((c) => c.code === courseCode);
    if (match) setCourse(match);
  }, [courseCode, courses]);

  const handleSave = async () => {
    if (!title.trim() || !course) {
      setError("Please fill in the title and course.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await updateNote(noteId, {
        title: title.trim(),
        course: course.code,
        semester: semester.trim(),
        description: description.trim(),
      });
      router.replace(`/(app)/library/notes/${noteId}`);
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" ") : "Couldn't save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.rootContainer}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/library")}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
          </Pressable>
          <Text style={styles.topNavTitle}>Edit Notes</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <LoadingSkeleton variant="form" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/library")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>Edit Notes</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Note Title"
              placeholderTextColor={appColors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Academic Course *</Text>
            <CoursePicker
              value={course}
              onChange={setCourse}
              placeholder="Select Course Code / Name"
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Semester (e.g. Fall 2025)"
              placeholderTextColor={appColors.textMuted}
              value={semester}
              onChangeText={setSemester}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description / Topics Covered"
              placeholderTextColor={appColors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryBtn, isSaving && styles.primaryBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formContainer: {
    width: "100%",
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    fontSize: 14,
    color: appColors.text,
  },
  textArea: {
    minHeight: 90,
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
  primaryBtn: {
    backgroundColor: "#FDBF1E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "800",
  },
});
