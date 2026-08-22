import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import { submitLibraryProject } from "../data/libraryApi";

export default function UploadProjectScreen() {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [abstract, setAbstract] = useState("");
  const [document, setDocument] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled) setDocument(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !department.trim() || !abstract.trim()) {
      setError("Please fill in every field.");
      return;
    }
    if (!document) {
      setError("Please attach your project PDF.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitLibraryProject({
        title: title.trim(),
        department: department.trim(),
        abstract: abstract.trim(),
        document: { uri: document.uri, name: document.name, mimeType: document.mimeType },
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

      <Card style={styles.card}>
        <TextField label="Title" placeholder="Project title" value={title} onChangeText={setTitle} />
        <TextField label="Department" placeholder="e.g. Computer Science" value={department} onChangeText={setDepartment} />
        <TextField
          label="Abstract"
          placeholder="Summarize the project in a few sentences"
          value={abstract}
          onChangeText={setAbstract}
          multiline
          numberOfLines={4}
          style={styles.abstractInput}
        />

        <View>
          <Text style={styles.fieldLabel}>Document</Text>
          <Button
            label={document ? document.name : "Choose PDF"}
            variant="ghost"
            onPress={pickDocument}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Submit for Review" onPress={handleSubmit} loading={isSubmitting} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginBottom: spacing.md },
  card: { gap: spacing.md },
  fieldLabel: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textSecondary, marginBottom: spacing.xs },
  abstractInput: { height: 100, paddingTop: spacing.sm, textAlignVertical: "top" },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  confirmation: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  confirmTitle: { fontSize: typography.size.lg, fontFamily: font.serif, color: colors.ink, textAlign: "center" },
  confirmBody: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, textAlign: "center", lineHeight: 21 },
});
