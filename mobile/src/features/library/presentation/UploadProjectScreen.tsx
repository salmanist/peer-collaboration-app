import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, DepartmentPicker, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import type { Department } from "../../../core/network/departmentsApi";
import { submitLibraryProject, type LibraryProjectLevel } from "../data/libraryApi";
import { LevelPicker } from "./LevelPicker";

export default function UploadProjectScreen() {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<Department | null>(null);
  const [abstract, setAbstract] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [level, setLevel] = useState<LibraryProjectLevel>("simple");
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
    if (!title.trim() || !department || !abstract.trim()) {
      setError("Please fill in every field.");
      return;
    }
    if (!files.length) {
      setError("Please attach at least one file.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitLibraryProject({
        title: title.trim(),
        department: department.short_name,
        abstract: abstract.trim(),
        githubLink: githubLink.trim(),
        level,
        files: files.map((f) => ({ uri: f.uri, name: f.name, mimeType: f.mimeType, file: f.file })),
      });
      setSubmitted(true);
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" ") : "Couldn't submit this project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <ScreenContainer center back="/(app)/library">
        <View style={styles.confirmation}>
          <Badge label="In moderation queue" tone="warning" />
          <Text style={styles.confirmTitle}>Submitted for review</Text>
          <Text style={styles.confirmBody}>
            A department moderator will review your submission before it appears in the Digital Library. You'll get
            a notification once it's approved.
          </Text>
          <Button label="Back to Library" onPress={() => router.replace("/(app)/library")} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll back="/(app)/library">
      <Text style={styles.title}>Submit a Project</Text>

      <Card contentStyle={styles.card}>
        <TextField label="Title" placeholder="Project title" value={title} onChangeText={setTitle} />
        <DepartmentPicker label="Department" value={department} onChange={setDepartment} />
        <TextField
          label="Abstract"
          placeholder="Summarize the project in a few sentences"
          value={abstract}
          onChangeText={setAbstract}
          multiline
          numberOfLines={4}
          style={styles.abstractInput}
        />
        <TextField
          label="GitHub Repo Link (optional)"
          placeholder="https://github.com/your-username/your-project"
          value={githubLink}
          onChangeText={setGithubLink}
          autoCapitalize="none"
          keyboardType="url"
        />
        <LevelPicker label="Project Level" value={level} onChange={setLevel} />

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

        <Button label="Submit for Review" onPress={handleSubmit} loading={isSubmitting} />
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
  abstractInput: { height: 100, paddingTop: spacing.sm, textAlignVertical: "top" },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  confirmation: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  confirmTitle: { fontSize: typography.size.lg, fontFamily: font.serif, color: colors.ink, textAlign: "center" },
  confirmBody: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, textAlign: "center", lineHeight: 21 },
});
