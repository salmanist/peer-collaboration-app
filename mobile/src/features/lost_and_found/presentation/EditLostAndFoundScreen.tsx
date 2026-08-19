import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

import { API_BASE_URL } from "../../../core/network/apiClient";
import { fetchLostAndFoundItem, updateLostAndFoundItem } from "../data/lostAndFoundApi";
import {
  LOST_AND_FOUND_CATEGORIES,
  type LostAndFoundCategory,
  type LostAndFoundPostType,
  type LostAndFoundStatus,
} from "../lostAndFound";

function getImageUrl(imagePath: string | null) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    try {
      const url = new URL(imagePath);
      const backendUrl = new URL(API_BASE_URL);
      return `${backendUrl.protocol}//${backendUrl.host}${url.pathname}${url.search}`;
    } catch {
      return imagePath;
    }
  }
  const host = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${host}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

export default function EditLostAndFoundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);

  const [postType, setPostType] = useState<LostAndFoundPostType>("lost");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LostAndFoundCategory>("other");
  const [location, setLocation] = useState("");
  const [dateLostOrFound, setDateLostOrFound] = useState("");
  const [description, setDescription] = useState("");
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [status, setStatus] = useState<LostAndFoundStatus>("open");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!Number.isInteger(itemId)) {
      setErrorMessage("Invalid notice ID.");
      setIsLoading(false);
      return;
    }

    const loadItem = async () => {
      try {
        const item = await fetchLostAndFoundItem(itemId);
        setPostType(item.post_type);
        setTitle(item.title);
        setCategory(item.category);
        setLocation(item.location);
        setDateLostOrFound(item.date_lost_or_found || "");
        setDescription(item.description);
        setExistingImage(item.image);
        setStatus(item.status);
      } catch {
        setErrorMessage("Could not load item notice details.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadItem();
  }, [itemId]);

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
      setErrorMessage("Please enter the campus location.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Please provide a description.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await updateLostAndFoundItem(itemId, {
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
        err?.message ||
        "Could not update notice. Please try again.";
      setErrorMessage(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Edit Notice</Text>
        </View>

        {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

        {/* Title */}
        <Text style={styles.fieldLabel}>Item Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        {/* Category */}
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
        <TextInput style={styles.input} value={location} onChangeText={setLocation} />

        {/* Date */}
        <Text style={styles.fieldLabel}>Date Lost or Found (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={dateLostOrFound} onChangeText={setDateLostOrFound} />

        {/* Description */}
        <Text style={styles.fieldLabel}>Detailed Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {/* Photo */}
        <Text style={styles.fieldLabel}>Photo</Text>
        {selectedImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} resizeMode="cover" />
            <Pressable style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
              <Text style={styles.removeImageText}>✕ Remove New Photo</Text>
            </Pressable>
          </View>
        ) : existingImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: getImageUrl(existingImage)! }} style={styles.previewImage} resizeMode="cover" />
            <Pressable style={styles.photoUploadBtn} onPress={() => void pickImage()}>
              <Text style={styles.photoUploadText}>📷 Replace Photo</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.photoUploadBtn} onPress={() => void pickImage()}>
            <Text style={styles.photoUploadIcon}>📷</Text>
            <Text style={styles.photoUploadText}>Tap to add a photo</Text>
          </Pressable>
        )}

        {/* Save Button */}
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={() => void onSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingTop: 56 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  backLink: { color: "#1d4ed8", fontWeight: "700", fontSize: 14 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  errorBanner: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#334155", marginTop: 14, marginBottom: 6 },
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
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  photoUploadIcon: { fontSize: 24, marginBottom: 4 },
  photoUploadText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  imagePreviewContainer: { backgroundColor: "#ffffff", borderRadius: 8, padding: 10, borderColor: "#e2e8f0", borderWidth: 1, alignItems: "center" },
  previewImage: { width: "100%", height: 180, borderRadius: 6 },
  removeImageBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 12 },
  removeImageText: { color: "#b91c1c", fontWeight: "700", fontSize: 13 },
  submitButton: { backgroundColor: "#1d4ed8", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 24 },
  submitButtonDisabled: { backgroundColor: "#94a3b8" },
  submitButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
});
