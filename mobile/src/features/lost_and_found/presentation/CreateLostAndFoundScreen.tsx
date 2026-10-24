import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
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
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ImageSourceModal } from "../../../core/components/ImageSourceModal";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { createLostAndFoundItem } from "../data/lostAndFoundApi";
import {
  LOST_AND_FOUND_CATEGORIES,
  type LostAndFoundCategory,
  type LostAndFoundPostType,
} from "../lostAndFound";

export default function CreateLostAndFoundScreen() {
  const insets = useSafeAreaInsets();
  const { invalidateLostAndFound } = useDataStore();
  const [postType, setPostType] = useState<LostAndFoundPostType>("lost");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<LostAndFoundCategory>("other");
  const [location, setLocation] = useState("");
  const [dateLostOrFound, setDateLostOrFound] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

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
      setErrorMessage("Please specify where the item was lost or found on campus.");
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
      await createLostAndFoundItem({
        post_type: postType,
        title: cleanTitle,
        category,
        location: cleanLocation,
        date_lost_or_found: cleanDate || null,
        description: cleanDesc,
        image: selectedImage,
      });
      invalidateLostAndFound();
      router.replace("/(app)/lost-and-found" as any);
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
        detail = err?.message || "Could not create notice. Please try again.";
      }
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => goBack("/(app)/lost-and-found")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
        </Pressable>
        <Text style={styles.topNavTitle}>Post Notice</Text>
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
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.red700} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Post Type Selector */}
        <Text style={styles.fieldLabel}>Notice Type *</Text>
        <View style={styles.typeRow}>
          <Pressable
            style={[styles.typeOption, postType === "lost" && styles.typeOptionLostActive]}
            onPress={() => setPostType("lost")}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={24}
              color={postType === "lost" ? appColors.primary : appColors.textSecondary}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.typeOptionTitle, postType === "lost" && styles.typeOptionTitleActive]}>
              I Lost Something
            </Text>
            <Text style={styles.typeOptionDesc}>Post a notice to find your misplaced item</Text>
          </Pressable>

          <Pressable
            style={[styles.typeOption, postType === "found" && styles.typeOptionFoundActive]}
            onPress={() => setPostType("found")}
          >
            <MaterialCommunityIcons
              name="package-variant"
              size={24}
              color={postType === "found" ? appColors.primary : appColors.textSecondary}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.typeOptionTitle, postType === "found" && styles.typeOptionTitleActive]}>
              I Found Something
            </Text>
            <Text style={styles.typeOptionDesc}>Help return a discovered item to its owner</Text>
          </Pressable>
        </View>

        {/* Title Input */}
        <TextInput
          style={styles.input}
          placeholder="Item Title (e.g. Black Dell Laptop Charger, Student ID Card)"
          placeholderTextColor={appColors.textMuted}
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

        {/* Specific Location Details */}
        <TextInput
          style={styles.input}
          placeholder="Location on Campus (e.g. Central Library 2nd Floor, CS Lab 3)"
          placeholderTextColor={appColors.textMuted}
          value={location}
          onChangeText={setLocation}
        />

        {/* Date Lost or Found (Strict Date format YYYY-MM-DD) */}
        <TextInput
          style={[styles.input, { marginTop: 12 }]}
          placeholder="Date Lost / Found (YYYY-MM-DD, e.g. 2026-08-23)"
          placeholderTextColor={appColors.textMuted}
          value={dateLostOrFound}
          onChangeText={setDateLostOrFound}
        />

        {/* Description */}
        <TextInput
          style={[styles.input, styles.textArea, { marginTop: 12 }]}
          placeholder="Detailed Description (distinguishing features, color, brand...)"
          placeholderTextColor={appColors.textMuted}
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
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="close" size={14} color={appColors.danger} style={{ marginRight: 4 }} />
                <Text style={styles.removeImageText}>Remove Photo</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.photoUploadBtn} onPress={() => setIsImagePickerOpen(true)}>
            <MaterialCommunityIcons name="camera-plus-outline" size={28} color={appColors.primary} style={{ marginBottom: 4 }} />
            <Text style={styles.photoUploadText}>Tap to add photo (Camera or Gallery)</Text>
          </Pressable>
        )}

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={() => void onSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={appColors.black} />
          ) : (
            <Text style={styles.submitButtonText}>
              Publish {postType === "lost" ? "Lost Item" : "Found Item"} Notice
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <ImageSourceModal
        visible={isImagePickerOpen}
        onClose={() => setIsImagePickerOpen(false)}
        onImageSelected={(img) => setSelectedImage({ uri: img.uri })}
        title="Attach Item Photo"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
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
    fontSize: 17,
    fontWeight: "800",
    color: appColors.onHeader,
  },
  scrollContent: {
    padding: 16,
  },
  errorBanner: {
    backgroundColor: appColors.dangerBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: appColors.red200,
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    color: appColors.red700,
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
  typeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 6,
  },
  typeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: appColors.white,
    borderColor: appColors.border,
    borderWidth: 2,
    alignItems: "center",
  },
  typeOptionLostActive: {
    borderColor: appColors.danger,
    backgroundColor: appColors.red50,
  },
  typeOptionFoundActive: {
    borderColor: appColors.primary,
    backgroundColor: appColors.surfaceMuted,
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeOptionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.textSecondary,
  },
  typeOptionTitleActive: {
    color: appColors.text,
  },
  typeOptionDesc: {
    fontSize: 11,
    color: appColors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  input: {
    backgroundColor: appColors.white,
    borderColor: appColors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: appColors.text,
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
    backgroundColor: appColors.white,
    borderColor: appColors.border,
    borderWidth: 1,
  },
  catBtnActive: {
    backgroundColor: appColors.primary,
    borderColor: appColors.primary,
  },
  catBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  catBtnTextActive: {
    color: appColors.gold,
    fontWeight: "700",
  },
  photoUploadBtn: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: appColors.primary,
    borderStyle: "dashed",
    backgroundColor: appColors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  photoUploadIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  photoUploadText: {
    color: appColors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  imagePreviewContainer: {
    backgroundColor: appColors.white,
    borderRadius: 12,
    padding: 10,
    borderColor: appColors.border,
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
    color: appColors.red700,
    fontWeight: "700",
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: appColors.gold,
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
    color: appColors.black,
    fontWeight: "800",
    fontSize: 15,
  },
});
