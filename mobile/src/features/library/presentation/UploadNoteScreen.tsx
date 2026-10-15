import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, CoursePicker, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import type { AcademicCourse } from "../../../core/network/coursesApi";
import { submitNote } from "../data/notesApi";

export default function UploadNoteScreen() {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState<AcademicCourse | null>(null);
  const [semester, setSemester] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (!result.canceled) setFiles((prev) => [...prev, ...result.assets]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !course) {
      setError("Please fill in the title and course.");
      return;
    }
    if (!files.length) {
      setError("Please attach at least one file.");
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
      <ScreenContainer center back="/(app)/library">
        <View style={styles.confirmation}>
          <Text style={styles.confirmTitle}>Notes shared</Text>
          <Text style={styles.confirmBody}>Your notes are live in the Digital Library right away - no review wait.</Text>
          <Button label="Back to Library" onPress={() => router.replace("/(app)/library")} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll back="/(app)/library">
      <Text style={styles.title}>Share Notes</Text>

      <Card contentStyle={styles.card}>
        <TextField label="Heading" placeholder="What are these notes about?" value={title} onChangeText={setTitle} />
        <CoursePicker label="Course" value={course} onChange={setCourse} />
        <TextField label="Semester (optional)" placeholder="e.g. Fall 2025" value={semester} onChangeText={setSemester} />
        <TextField
          label="Description (optional)"
          placeholder="Summarize what's covered"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={styles.descriptionInput}
        />

        <View>
          <Text style={styles.fieldLabel}>Files</Text>
          <Button label="Add Files" variant="ghost" onPress={pickFiles} />
          {files.length > 0 && (
            <View style={styles.fileList}>
              {files.map((f, index) => (
                <View key={`${f.name}-${index}`} style={styles.fileRow}>
                  <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                  <Pressable onPress={() => removeFile(index)} hitSlop={8}>
                    <MaterialCommunityIcons name="close" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Share Notes" onPress={handleSubmit} loading={isSubmitting} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginBottom: spacing.md },
  card: { gap: spacing.lg },
  fieldLabel: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textSecondary, marginBottom: spacing.xs },
  fileList: { gap: spacing.xs, marginTop: spacing.sm },
  fileRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  fileName: { flex: 1, fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.text },
  descriptionInput: { height: 100, paddingTop: spacing.sm, textAlignVertical: "top" },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  confirmation: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  confirmTitle: { fontSize: typography.size.lg, fontFamily: font.serif, color: colors.ink, textAlign: "center" },
  confirmBody: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, textAlign: "center", lineHeight: 21 },
});
