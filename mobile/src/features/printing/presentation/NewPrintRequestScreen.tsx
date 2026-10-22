import { colors as appColors } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { submitPrintRequest } from "../data/printingApi";

const PRINTABLE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

export default function NewPrintRequestScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ printerId?: string; printerName?: string }>();
  const [targetPrinter, setTargetPrinter] = useState(
    params.printerId ? { id: Number(params.printerId), name: params.printerName ?? "" } : null,
  );
  const [document, setDocument] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [pageRange, setPageRange] = useState("");
  const [copies, setCopies] = useState("1");
  const [isColor, setIsColor] = useState(false);
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

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
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/printing")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>New Print Request</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        {/* Error Banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}



        {/* Document Upload Area */}
        <Text style={styles.fieldLabel}>Select Document to Print *</Text>
        <Pressable
          style={[styles.uploadArea, document && { backgroundColor: appColors.surfaceMuted, borderColor: appColors.primary }]}
          onPress={pickDocument}
        >
          {document ? (
            <View style={{ width: "100%", alignItems: "center", gap: 6 }}>
              <View style={[styles.uploadIconCircle, { backgroundColor: "#DCFCE7" }]}>
                <MaterialCommunityIcons name="file-document-check-outline" size={28} color={appColors.primary} />
              </View>
              <Text style={[styles.uploadTitle, { textAlign: "center", paddingHorizontal: 12 }]} numberOfLines={2}>
                {document.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: appColors.primary, fontWeight: "700" }}>Tap to change file</Text>
                <Pressable
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation();
                    setDocument(null);
                  }}
                >
                  <MaterialCommunityIcons name="close-circle" size={18} color="#DC2626" />
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.uploadIconCircle}>
                <MaterialCommunityIcons name="file-upload-outline" size={26} color={appColors.primary} />
              </View>
              <Text style={styles.uploadTitle}>Tap to pick PDF, DOCX, or Image</Text>
              <Text style={styles.uploadSub}>PDF, Word, or image up to 25MB</Text>
            </>
          )}
        </Pressable>

        {/* Page Range & Copies */}
        <TextInput
          style={styles.input}
          placeholder="Page Range (e.g. 1-5, 8; leave empty for all pages)"
          placeholderTextColor={appColors.textMuted}
          value={pageRange}
          onChangeText={setPageRange}
        />

        <TextInput
          style={[styles.input, { marginTop: 12 }]}
          placeholder="Number of Copies (e.g. 1)"
          placeholderTextColor={appColors.textMuted}
          value={copies}
          onChangeText={setCopies}
          keyboardType="number-pad"
        />

        {/* Switches */}
        <Text style={styles.fieldLabel}>Print Options</Text>
        <View style={styles.switchCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.switchLabel}>Colour Printing</Text>
              <Text style={styles.switchSub}>Off prints standard Black & White.</Text>
            </View>
            <Switch
              value={isColor}
              onValueChange={setIsColor}
              trackColor={{ true: appColors.primary, false: appColors.border }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.switchLabel}>Double-Sided Printing (Duplex)</Text>
              <Text style={styles.switchSub}>Off prints on one side of each page.</Text>
            </View>
            <Switch
              value={isDoubleSided}
              onValueChange={setIsDoubleSided}
              trackColor={{ true: appColors.primary, false: appColors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Submit Button in Lost & Found Yellow / Gold */}
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.submitButtonText}>Send Print Request</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
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
    fontSize: 17,
    fontWeight: "800",
    color: appColors.primary,
  },
  scrollContent: {
    padding: 16,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
    marginTop: 14,
    marginBottom: 6,
  },
  targetBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 12,
    marginBottom: 4,
  },
  targetIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  targetTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  targetSub: {
    fontSize: 13,
    fontWeight: "600",
    color: appColors.text,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.primary,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 14,
    color: appColors.text,
  },
  uploadArea: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: appColors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.primary,
  },
  uploadSub: {
    fontSize: 11,
    color: appColors.textSecondary,
  },
  fileSelectedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 10,
    marginTop: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: appColors.primary,
  },
  switchCard: {
    backgroundColor: appColors.surfaceMuted,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  switchSub: {
    fontSize: 11,
    color: appColors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: appColors.border,
  },
  submitButton: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 15,
  },
});
