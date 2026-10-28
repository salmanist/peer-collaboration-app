import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import {
  createPublicResourceRequest,
  createResourceListing,
} from "../data/resourcesApi";
import type {
  ResourceCategory,
  ResourceCondition,
  ResourceExchangeType,
} from "../resources";

type PostMode = "share" | "request";

const categoryOptions: { value: ResourceCategory; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: "notes", label: "Course Notes", icon: "file-document-edit-outline" },
  { value: "books", label: "Textbooks", icon: "book-open-page-variant" },
  { value: "stationery", label: "Stationery", icon: "ruler-square" },
  { value: "lab_equipment", label: "Lab Gear", icon: "flask-outline" },
  { value: "other", label: "Other", icon: "package-variant-closed" },
];

const conditionOptions: { value: ResourceCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
];

const shareExchangeOptions: { value: ResourceExchangeType; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "sell", label: "Sell" },
  { value: "rent", label: "Rent" },
  { value: "lend", label: "Lend" },
  { value: "exchange", label: "Exchange" },
];

const requestExchangeOptions: { value: ResourceExchangeType; label: string }[] = [
  { value: "free", label: "Get Free" },
  { value: "sell", label: "Buy" },
  { value: "borrow" as any, label: "Borrow" },
  { value: "rent", label: "Rent" },
  { value: "exchange", label: "Exchange" },
];

function getCreateErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "Could not add the post. Please try again.";
  }

  if (!error.response) {
    return "Cannot reach the server. Please check your connection.";
  }

  const detail = error.response.data?.detail;
  if (typeof detail === "string") {
    return detail;
  }

  return "Please check the information and try again.";
}

export default function CreateResourceScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { invalidateResourceListings } = useDataStore();

  const [postMode, setPostMode] = useState<PostMode>(
    params.mode === "request" ? "request" : "share"
  );
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [category, setCategory] = useState<ResourceCategory>("notes");
  const [condition, setCondition] = useState<ResourceCondition>("used");
  const [exchangeType, setExchangeType] = useState<ResourceExchangeType>("free");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  const handleSubmit = async () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanPrice = price.trim();

    if (!cleanTitle || !cleanDescription) {
      setErrorMessage("Title and description are required.");
      return;
    }

    if (
      postMode === "share" &&
      (exchangeType === "sell" || exchangeType === "rent") &&
      (!cleanPrice || Number(cleanPrice) <= 0)
    ) {
      setErrorMessage("Enter a valid price.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (postMode === "share") {
        await createResourceListing({
          title: cleanTitle,
          course: course.trim() || undefined,
          description: cleanDescription,
          category,
          condition,
          exchange_type: exchangeType,
          image: selectedImage || undefined,
          ...(exchangeType === "sell" || exchangeType === "rent" ? { price: cleanPrice } : {}),
        });
      } else {
        await createPublicResourceRequest({
          title: cleanTitle,
          course: course.trim() || undefined,
          description: cleanDescription,
          category,
          desired_exchange_type: exchangeType,
        });
      }
      invalidateResourceListings();
      router.replace("/(app)/resources");
    } catch (error) {
      setErrorMessage(getCreateErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => goBack("/(app)/resources")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
        </Pressable>
        <Text style={styles.topNavTitle}>
          {postMode === "share" ? "Share an Item" : "Post a Request"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post Type Segment Switcher (Share vs Request) */}
        <View style={styles.segmentContainer}>
          <Pressable
            style={[styles.segmentBtn, postMode === "share" && styles.segmentBtnActive]}
            onPress={() => {
              setPostMode("share");
              setErrorMessage("");
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="package-variant-plus"
                size={16}
                color={postMode === "share" ? appColors.primary : appColors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentBtnText, postMode === "share" && styles.segmentBtnTextActive]}>
                Share Item
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, postMode === "request" && styles.segmentBtnActive]}
            onPress={() => {
              setPostMode("request");
              setErrorMessage("");
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="hand-wave-outline"
                size={16}
                color={postMode === "request" ? appColors.primary : appColors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentBtnText, postMode === "request" && styles.segmentBtnTextActive]}>
                Request Item
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>
            {postMode === "share" ? "List an Available Item" : "Post What You Need"}
          </Text>
          <Text style={styles.subtitle}>
            {postMode === "share"
              ? "Share textbooks, notes, lab gear, or hostel items with peers."
              : "Let campus peers know what textbooks, notes, or lab gear you're looking for."}
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={
            postMode === "share"
              ? "Item Title (e.g. Database Systems 6th Edition / Midterm Notes)"
              : "What do you need? (e.g. Data Structures & Algorithms)"
          }
          placeholderTextColor={appColors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, { marginTop: 12 }]}
          placeholder="Course Code (optional, e.g. CS-301, SE-204)"
          placeholderTextColor={appColors.textMuted}
          value={course}
          onChangeText={setCourse}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.optionsWrap}>
          {categoryOptions.map((cat) => {
            const isSelected = category === cat.value;
            return (
              <Pressable
                key={cat.value}
                style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                onPress={() => setCategory(cat.value)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name={cat.icon}
                    size={14}
                    color={isSelected ? appColors.primary : appColors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                    {cat.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {postMode === "share" ? (
          <>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.optionsWrap}>
              {conditionOptions.map((cond) => {
                const isSelected = condition === cond.value;
                return (
                  <Pressable
                    key={cond.value}
                    style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                    onPress={() => setCondition(cond.value)}
                  >
                    <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                      {isSelected ? `✓ ${cond.label}` : cond.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Sharing Type</Text>
            <View style={styles.optionsWrap}>
              {shareExchangeOptions.map((opt) => {
                const isSelected = exchangeType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                    onPress={() => setExchangeType(opt.value)}
                  >
                    <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                      {isSelected ? `✓ ${opt.label}` : opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {(exchangeType === "sell" || exchangeType === "rent") && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder={exchangeType === "rent" ? "Rental Price in PKR (e.g. 500)" : "Price in PKR (e.g. 500)"}
                placeholderTextColor={appColors.textMuted}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            )}

            <Text style={styles.label}>Photo (optional)</Text>
            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                <Pressable style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons name="close" size={14} color={appColors.red700} style={{ marginRight: 4 }} />
                    <Text style={styles.removeImageText}>Remove Photo</Text>
                  </View>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.imagePickerButton} onPress={() => setIsImagePickerOpen(true)}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons name="camera-plus-outline" size={18} color={appColors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.imagePickerButtonText}>Add Photo (Camera or Gallery)</Text>
                </View>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={styles.label}>I want to</Text>
            <View style={styles.optionsWrap}>
              {requestExchangeOptions.map((opt) => {
                const isSelected = exchangeType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                    onPress={() => setExchangeType(opt.value)}
                  >
                    <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                      {isSelected ? `✓ ${opt.label}` : opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <TextInput
          style={[styles.input, styles.descriptionInput, { marginTop: 14 }]}
          placeholder={
            postMode === "share"
              ? "Item Description (edition, chapters, condition, meetup spot...)"
              : "Details / Notes (author, edition, deadline, meetup preference...)"
          }
          placeholderTextColor={appColors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        {errorMessage ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.red700} style={{ marginRight: 4 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={appColors.primary} />
          ) : (
            <Text style={styles.submitButtonText}>
              {postMode === "share" ? "Publish Shared Item" : "Publish Request"}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <ImageSourceModal
        visible={isImagePickerOpen}
        onClose={() => setIsImagePickerOpen(false)}
        onImageSelected={(img) => setSelectedImage({ uri: img.uri })}
        title="Add Item Photo"
      />
    </View>
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
  container: {
    padding: 16,
    gap: 10,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: appColors.border,
    borderRadius: 14,
    padding: 4,
    marginBottom: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: appColors.white,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.035,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: appColors.textSecondary,
  },
  segmentBtnTextActive: {
    color: appColors.primary,
    fontWeight: "800",
  },
  header: {
    marginTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: appColors.text,
  },
  subtitle: {
    color: appColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    color: appColors.text,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 6,
  },
  input: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    padding: 12,
    color: appColors.text,
    fontSize: 14,
  },
  descriptionInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  imagePickerButton: {
    backgroundColor: appColors.white,
    borderWidth: 1.5,
    borderColor: appColors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerButtonText: {
    color: appColors.primary,
    fontWeight: "700",
    fontSize: 13.5,
  },
  imagePreviewContainer: {
    alignItems: "center",
    gap: 8,
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    resizeMode: "cover",
  },
  removeImageButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  removeImageText: {
    color: appColors.danger,
    fontWeight: "700",
    fontSize: 13,
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionPill: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  optionPillSelected: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.primary,
  },
  optionPillText: {
    color: appColors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  optionPillTextSelected: {
    color: appColors.primary,
    fontWeight: "800",
  },
  errorText: {
    color: appColors.danger,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: appColors.gold,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
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
    color: appColors.primary,
    fontWeight: "900",
    fontSize: 15,
  },
});
