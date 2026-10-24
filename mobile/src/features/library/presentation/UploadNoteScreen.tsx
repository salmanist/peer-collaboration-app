import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
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
import { submitNote } from "../data/notesApi";

export default function UploadNoteScreen() {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState<AcademicCourse | null>(null);
  const [semester, setSemester] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (!result.canceled) setFiles((prev) => [...prev, ...result.assets]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !course) {
      setError("Please enter a note title and select a course.");
      return;
    }
    if (!files.length) {
      setError("Please attach at least one note document or PDF.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitNote({
        title: title.trim(),
        course: course.code,
        semester: semester.trim(),
        description: description.trim(),
        files: files.map((f) => ({ uri: f.uri, name: f.name, mimeType: f.mimeType, file: f.file })),
      });
      setSubmitted(true);
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" ") : "Couldn't share these notes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.rootContainer}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={() => router.replace("/(app)/library")}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
          </Pressable>
          <Text style={styles.topNavTitle}>Notes Published</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.successIconCircle}>
            <MaterialCommunityIcons name="check-circle" size={56} color={appColors.primary} />
          </View>
          <Text style={styles.confirmTitle}>Notes Shared Successfully!</Text>
          <Text style={styles.confirmBody}>
            Your notes are now live in the Digital Library for fellow students to browse and study.
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace("/(app)/library")}
          >
            <Text style={styles.primaryBtnText}>Back to Library</Text>
          </Pressable>
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
        <Text style={styles.topNavTitle}>Share Course Notes</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        <View style={styles.formContainer}>
          {/* Note Title */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Note Title (e.g. Midterm Comprehensive Study Guide)"
              placeholderTextColor={appColors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Course Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Academic Course *</Text>
            <CoursePicker
              value={course}
              onChange={setCourse}
              placeholder="Select Course Code / Name"
            />
          </View>

          {/* Semester */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Semester (e.g. Fall 2025 or Semester 6)"
              placeholderTextColor={appColors.textMuted}
              value={semester}
              onChangeText={setSemester}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description / Topics Covered (highlight key chapters, topics...)"
              placeholderTextColor={appColors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Files Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Attach Note Documents / Slides *</Text>
            <Pressable style={styles.uploadArea} onPress={pickFiles}>
              <View style={styles.uploadIconCircle}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={appColors.primary} />
              </View>
              <Text style={styles.uploadAreaTitle}>Tap to select documents or PDFs</Text>
              <Text style={styles.uploadAreaSub}>PDF, PPTX, DOCX up to 25MB</Text>
            </Pressable>

            {files.length > 0 && (
              <View style={styles.fileList}>
                {files.map((f, index) => (
                  <View key={`${f.name}-${index}`} style={styles.fileItem}>
                    <MaterialCommunityIcons name="file-document-outline" size={18} color={appColors.primary} />
                    <Text style={styles.fileItemName} numberOfLines={1}>{f.name}</Text>
                    <Pressable onPress={() => removeFile(index)} hitSlop={8}>
                      <MaterialCommunityIcons name="close-circle" size={18} color={appColors.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryBtn, isSubmitting && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={appColors.black} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Share Notes Now</Text>
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
    backgroundColor: appColors.white,
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
    backgroundColor: appColors.white,
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
  uploadArea: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: appColors.border,
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appColors.background,
    gap: 6,
  },
  uploadIconCircle: {
    width: 42,
    height: 42,


    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  uploadAreaTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.primary,
  },
  uploadAreaSub: {
    fontSize: 11,
    color: appColors.textSecondary,
  },
  fileList: {
    marginTop: 8,
    gap: 6,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 8,
  },
  fileItemName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: appColors.textSecondary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.red50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: appColors.danger,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: appColors.gold,
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
    color: appColors.black,
    fontSize: 14,
    fontWeight: "800",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  successIconCircle: {
    width: 80,
    height: 80,


    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: appColors.text,
    textAlign: "center",
  },
  confirmBody: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
});
