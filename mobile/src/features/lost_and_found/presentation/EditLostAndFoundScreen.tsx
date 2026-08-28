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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
  const insets = useSafeAreaInsets();
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

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

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
    const cleanTitle = title.trim();
    const cleanLocation = location.trim();
    const cleanDesc = description.trim();
    const cleanDate = dateLostOrFound.trim();

    if (!cleanTitle) {
      setErrorMessage("Please enter an item title.");
      return;
    }
    if (!cleanLocation) {
      setErrorMessage("Please enter the campus location.");
      return;
    }
    if (!cleanDesc) {
      setErrorMessage("Please provide a description.");
      return;
    }

    if (cleanDate && !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      setErrorMessage("Please enter date in format YYYY-MM-DD (e.g. 2026-08-23).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await updateLostAndFoundItem(itemId, {
        post_type: postType,
        title: cleanTitle,
        category,
        location: cleanLocation,
        date_lost_or_found: cleanDate || null,
        description: cleanDesc,
        image: selectedImage,
      });
      router.replace(`/(app)/lost-and-found/${itemId}` as any);
    } catch (err: any) {
      const data = err?.response?.data;
      let detail = "";
      if (typeof data === "string") {
        detail = data;
      } else if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        detail = Array.isArray(val) ? val[0] : (typeof val === "string" ? val : JSON.stringify(val));
      } else {
        detail = err?.message || "Could not update notice. Please try again.";
      }
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0D3E02" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset + 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>Edit Notice</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Title */}
        <Text style={styles.fieldLabel}>Item Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Black Dell Laptop Charger"
          placeholderTextColor="#94a3b8"
          value={title}
          onChangeText={setTitle}
        />

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
        <TextInput
          style={styles.input}
          placeholder="e.g., Central Library 2nd Floor, CS Lab 3"
          placeholderTextColor="#94a3b8"
          value={location}
          onChangeText={setLocation}
        />

        {/* Date Lost or Found (Strict Date format YYYY-MM-DD) */}
        <Text style={styles.fieldLabel}>Date Lost / Found (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 2026-08-23"
          placeholderTextColor="#94a3b8"
          value={dateLostOrFound}
          onChangeText={setDateLostOrFound}
        />

        {/* Description */}
        <Text style={styles.fieldLabel}>Detailed Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe item details..."
          placeholderTextColor="#94a3b8"
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
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="close" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={styles.removeImageText}>Remove New Photo</Text>
              </View>
            </Pressable>
          </View>
        ) : existingImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: getImageUrl(existingImage)! }} style={styles.previewImage} resizeMode="cover" />
            <Pressable style={styles.photoUploadBtn} onPress={() => void pickImage()}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="camera-outline" size={16} color="#0D3E02" style={{ marginRight: 6 }} />
                <Text style={styles.photoUploadText}>Replace Photo</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.photoUploadBtn} onPress={() => void pickImage()}>
            <MaterialCommunityIcons name="camera-plus-outline" size={28} color="#64748b" style={{ marginBottom: 4 }} />
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
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.submitButtonText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  topNavBar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A5D6A7",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#070D1F",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFC",
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
    color: "#070D1F",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#070D1F",
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#E2E8F0",
    borderWidth: 1,
  },
  catBtnActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  catBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  catBtnTextActive: {
    color: "#FDBF1E",
    fontWeight: "700",
  },
  photoUploadBtn: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#0D3E02",
    borderStyle: "dashed",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  photoUploadIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  photoUploadText: {
    color: "#0D3E02",
    fontSize: 13,
    fontWeight: "700",
  },
  imagePreviewContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 10,
    borderColor: "#E2E8F0",
    borderWidth: 1,
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
  },
  removeImageBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeImageText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
