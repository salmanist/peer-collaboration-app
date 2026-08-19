import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { createLostAndFoundItem } from "../data/lostAndFoundApi";
import {
  LOST_AND_FOUND_CATEGORIES,
  type LostAndFoundCategory,
  type LostAndFoundPostType,
} from "../lostAndFound";

export default function CreateLostAndFoundScreen() {
  const [postType, setPostType] = useState<LostAndFoundPostType>("lost");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LostAndFoundCategory>("other");
  const [location, setLocation] = useState("");
  const [dateLostOrFound, setDateLostOrFound] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage({ uri: result.assets[0].uri });
      }
    } catch {
      setErrorMessage("Could not open gallery.");
    }
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      setErrorMessage("Please enter an item title.");
      return;
    }
    if (!location.trim()) {
      setErrorMessage("Please specify where the item was lost or found on campus.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Please provide a description.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await createLostAndFoundItem({
        post_type: postType,
        title: title.trim(),
        category,
        location: location.trim(),
        date_lost_or_found: dateLostOrFound || null,
        description: description.trim(),
        image: selectedImage,
      });
      router.back();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.title?.[0] ||
        err?.response?.data?.location?.[0] ||
        err?.message ||
        "Could not create notice. Please try again.";
      setErrorMessage(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Post Lost / Found Notice</Text>
        </View>

        {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

        {/* Post Type Selector */}
        <Text style={styles.fieldLabel}>Notice Type *</Text>
        <View style={styles.typeRow}>
          <Pressable
            style={[styles.typeOption, postType === "lost" && styles.typeOptionLostActive]}
            onPress={() => setPostType("lost")}
          >
            <Text style={styles.typeEmoji}>🔍</Text>
            <Text style={[styles.typeOptionTitle, postType === "lost" && styles.typeOptionTitleActive]}>
              I Lost Something
            </Text>
            <Text style={styles.typeOptionDesc}>Post a notice to find your misplaced item</Text>
          </Pressable>

          <Pressable
            style={[styles.typeOption, postType === "found" && styles.typeOptionFoundActive]}
            onPress={() => setPostType("found")}
          >
            <Text style={styles.typeEmoji}>📦</Text>
            <Text style={[styles.typeOptionTitle, postType === "found" && styles.typeOptionTitleActive]}>
              I Found Something
            </Text>
            <Text style={styles.typeOptionDesc}>Help return a discovered item to its owner</Text>
          </Pressable>
        </View>

        {/* Title Input */}
        <Text style={styles.fieldLabel}>Item Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Black Dell Laptop Charger, Student ID Card"
          value={title}
          onChangeText={setTitle}
        />

        {/* Category Picker */}
        <Text style={styles.fieldLabel}>Category *</Text>
        <View style={styles.categoryGrid}>
          {LOST_AND_FOUND_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              style={[styles.catBtn, category === cat.value && styles.catBtnActive]}
              onPress={() => setCategory(cat.value)}
            >
              <Text style={[styles.catBtnText, category === cat.value && styles.catBtnTextActive]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Campus Location */}
        <Text style={styles.fieldLabel}>Campus Location *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Central Library 2nd Floor, CS Lab 3, Cafeteria"
          value={location}
          onChangeText={setLocation}
        />

        {/* Date Lost or Found */}
        <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={dateLostOrFound}
          onChangeText={setDateLostOrFound}
        />

        {/* Description */}
        <Text style={styles.fieldLabel}>Detailed Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe distinguishing features, color, brand, or where exactly it was left/found..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* Photo Upload */}
        <Text style={styles.fieldLabel}>Photo (Optional)</Text>
        {selectedImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} resizeMode="cover" />
            <Pressable style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
              <Text style={styles.removeImageText}>✕ Remove Photo</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.photoUploadBtn} onPress={() => void pickImage()}>
            <Text style={styles.photoUploadIcon}>📷</Text>
            <Text style={styles.photoUploadText}>Tap to attach a photo</Text>
          </Pressable>
        )}

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={() => void onSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              Publish {postType === "lost" ? "Lost Item" : "Found Item"} Notice
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingTop: 56 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  backLink: { color: "#1d4ed8", fontWeight: "700", fontSize: 14 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  errorBanner: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#334155", marginTop: 14, marginBottom: 6 },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 6 },
  typeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 2,
    alignItems: "center",
  },
  typeOptionLostActive: { borderColor: "#ef4444", backgroundColor: "#fff5f5" },
  typeOptionFoundActive: { borderColor: "#10b981", backgroundColor: "#f0fdf4" },
  typeEmoji: { fontSize: 24, marginBottom: 4 },
  typeOptionTitle: { fontSize: 13, fontWeight: "700", color: "#475569" },
  typeOptionTitleActive: { color: "#0f172a" },
  typeOptionDesc: { fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 2 },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderWidth: 1 },
  catBtnActive: { backgroundColor: "#1e293b", borderColor: "#1e293b" },
  catBtnText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  catBtnTextActive: { color: "#ffffff" },
  photoUploadBtn: {
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  photoUploadIcon: { fontSize: 28, marginBottom: 4 },
  photoUploadText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  imagePreviewContainer: { backgroundColor: "#ffffff", borderRadius: 8, padding: 10, borderColor: "#e2e8f0", borderWidth: 1, alignItems: "center" },
  previewImage: { width: "100%", height: 180, borderRadius: 6 },
  removeImageBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 12 },
  removeImageText: { color: "#b91c1c", fontWeight: "700", fontSize: 13 },
  submitButton: { backgroundColor: "#1d4ed8", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 24 },
  submitButtonDisabled: { backgroundColor: "#94a3b8" },
  submitButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
});
