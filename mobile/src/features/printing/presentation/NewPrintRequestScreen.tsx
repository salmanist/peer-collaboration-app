import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import { submitPrintRequest } from "../data/printingApi";
import { SwitchRow } from "./printUi";

const PRINTABLE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

export default function NewPrintRequestScreen() {
  // Set when a printer card was tapped on the Print Centre home; cleared by "Send to any printer".
  const params = useLocalSearchParams<{ printerId?: string; printerName?: string }>();
  const [targetPrinter, setTargetPrinter] = useState(params.printerId ? { id: Number(params.printerId), name: params.printerName ?? "" } : null);
  const [document, setDocument] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [pageRange, setPageRange] = useState("");
  const [copies, setCopies] = useState("1");
  const [isColor, setIsColor] = useState(false);
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: PRINTABLE_TYPES });
    if (!result.canceled) setDocument(result.assets[0]);
  };

  const handleSubmit = async () => {
    const copiesCount = Number(copies);
    if (!document) {
      setError("Please choose a document to print.");
      return;
    }
    if (!Number.isInteger(copiesCount) || copiesCount < 1 || copiesCount > 100) {
      setError("Copies must be a whole number between 1 and 100.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await submitPrintRequest({
        copies: copiesCount,
        pageRange: pageRange.trim(),
        isColor,
        isDoubleSided,
        targetPrinterId: targetPrinter?.id,
        document: { uri: document.uri, name: document.name, mimeType: document.mimeType, file: document.file },
      });
      router.replace(`/(app)/printing/${created.id}`);
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" ") : "Couldn't send this print request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll back="/(app)/printing">
      <Text style={styles.title}>New print request</Text>

      <Card contentStyle={styles.card}>
        <View style={styles.targetRow}>
          <MaterialCommunityIcons name="printer-outline" size={18} color={colors.textMuted} />
          <Text style={styles.targetText} numberOfLines={1}>
            {targetPrinter ? `Sending to ${targetPrinter.name || "a printer"}` : "Sending to any printer"}
          </Text>
          {targetPrinter ? (
            <Pressable onPress={() => setTargetPrinter(null)} hitSlop={8}>
              <Text style={styles.targetAction}>Send to any printer</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.replace("/(app)/printing")} hitSlop={8}>
              <Text style={styles.targetAction}>Choose a printer</Text>
            </Pressable>
          )}
        </View>

        <View>
          <Text style={styles.fieldLabel}>Document</Text>
          <Button label={document ? "Change document" : "Choose document"} variant="ghost" onPress={pickDocument} />
          {document && (
            <View style={styles.fileRow}>
              <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.textMuted} />
              <Text style={styles.fileName} numberOfLines={1}>{document.name}</Text>
            </View>
          )}
        </View>

        <TextField label="Page range (optional)" placeholder='e.g. 1-5,8 - leave empty for all pages' value={pageRange} onChangeText={setPageRange} />
        <TextField label="Copies" value={copies} onChangeText={setCopies} keyboardType="number-pad" />
        <SwitchRow label="Colour" hint="Off prints in black and white." value={isColor} onChange={setIsColor} />
        <SwitchRow label="Double-sided" hint="Off prints on one side only." value={isDoubleSided} onChange={setIsDoubleSided} />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Send request" onPress={handleSubmit} loading={isSubmitting} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginBottom: spacing.md },
  card: { gap: spacing.lg },
  fieldLabel: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textSecondary, marginBottom: spacing.xs },
  fileRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  fileName: { flex: 1, fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.text },
  targetRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  targetText: { flex: 1, fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.ink },
  targetAction: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.primary },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
});
