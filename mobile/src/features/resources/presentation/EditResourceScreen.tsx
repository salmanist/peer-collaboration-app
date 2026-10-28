import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { deleteResourceListing, fetchResourceListing, updateResourceListing } from "../data/resourcesApi";
import type { ResourceCategory, ResourceCondition, ResourceExchangeType } from "../resources";

const categoryOptions: { value: ResourceCategory; label: string }[] = [
  { value: "notes", label: "Course Notes" },
  { value: "books", label: "Textbooks" },
  { value: "stationery", label: "Stationery" },
  { value: "lab_equipment", label: "Lab Gear" },
  { value: "other", label: "Other Supplies" },
];

const conditionOptions: { value: ResourceCondition; label: string }[] = [
  { value: "new", label: "Brand New" },
  { value: "used", label: "Used / Pre-owned" },
];

const exchangeOptions: { value: ResourceExchangeType; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "lend", label: "Lend" },
  { value: "exchange", label: "Exchange" },
  { value: "sell", label: "Sell" },
  { value: "rent", label: "Rent" },
];

export default function EditResourceScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Number(id);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<ResourceCategory>("notes");
  const [condition, setCondition] = useState<ResourceCondition>("used");
  const [exchangeType, setExchangeType] = useState<ResourceExchangeType>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  useEffect(() => {
    async function loadListing() {
      if (!Number.isInteger(listingId)) {
        setErrorMessage("This listing link is invalid.");
        setIsLoading(false);
        return;
      }
      try {
        const listing = await fetchResourceListing(listingId);
        setTitle(listing.title);
        setCourse(listing.course || "");
        setDescription(listing.description);
        setPrice(listing.price ?? "");
        setCategory(listing.category);
        setCondition(listing.condition);
        setExchangeType(listing.exchange_type);
        setExistingImageUrl(listing.image);
      } catch {
        setErrorMessage("Could not load this listing.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadListing();
  }, [listingId]);

  const confirmDelete = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to delete this listing? This action cannot be undone.");
      if (confirmed) {
        void handleDelete();
      }
    } else {
      Alert.alert(
        "Delete Listing",
        "Are you sure you want to delete this listing? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => void handleDelete() },
        ]
      );
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage("");
    try {
      await deleteResourceListing(listingId);
      router.replace("/(app)/resources/mine" as any);
    } catch {
      setErrorMessage("Could not delete this listing. Please try again.");
      setIsDeleting(false);
    }
  };

  const save = async () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanPrice = price.trim();
    const isPriced = exchangeType === "sell" || exchangeType === "rent";
    if (!cleanTitle || !cleanDescription) {
      setErrorMessage("Title and description are required.");
      return;
    }
    if (isPriced && (!cleanPrice || Number(cleanPrice) <= 0)) {
      setErrorMessage("Enter a valid price.");
      return;
    }
    setErrorMessage("");
    setIsSaving(true);
    try {
      await updateResourceListing(listingId, {
        title: cleanTitle,
        course: course.trim(),
        description: cleanDescription,
        category,
        condition,
        exchange_type: exchangeType,
        price: isPriced ? cleanPrice : null,
        image: selectedImage || undefined,
      });
      router.replace("/resources/mine");
    } catch {
      setErrorMessage("Could not save this listing. Please check the information.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <LoadingSkeleton variant="form" />
      </View>
    );
  }

  const displayImageUri = selectedImage ? selectedImage.uri : existingImageUrl;

  return (
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar with Back Button and Delete Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => goBack("/(app)/resources")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
        </Pressable>
        <Text style={styles.topNavTitle}>Edit Resource</Text>
        <Pressable
          style={styles.navDeleteBtn}
          onPress={confirmDelete}
          disabled={isDeleting || isSaving}
          accessibilityLabel="Delete Listing"
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={appColors.danger} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Resource title"
          placeholderTextColor={appColors.textMuted}
        />

        <TextInput
          style={[styles.input, { marginTop: 12 }]}
          value={course}
          onChangeText={setCourse}
          placeholder="Course Code (optional, e.g. CS-301)"
          placeholderTextColor={appColors.textMuted}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.optionsWrap}>
          {categoryOptions.map((opt) => {
            const isSelected = category === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                onPress={() => setCategory(opt.value)}
              >
                <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Condition</Text>
        <View style={styles.optionsWrap}>
          {conditionOptions.map((opt) => {
            const isSelected = condition === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                onPress={() => setCondition(opt.value)}
              >
                <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Sharing Type</Text>
        <View style={styles.optionsWrap}>
          {exchangeOptions.map((opt) => {
            const isSelected = exchangeType === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                onPress={() => setExchangeType(opt.value)}
              >
                <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {exchangeType === "sell" || exchangeType === "rent" ? (
          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder={exchangeType === "rent" ? "Rental Price in PKR (e.g. 500)" : "Price in PKR (e.g. 500)"}
            placeholderTextColor={appColors.textMuted}
          />
        ) : null}

        <Text style={styles.label}>Photo (optional)</Text>
        {displayImageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: displayImageUri }} style={styles.imagePreview} />
            <Pressable style={styles.changeImageButton} onPress={() => setIsImagePickerOpen(true)}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="camera-retake-outline" size={16} color={appColors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.changeImageText}>Change Photo (Camera / Gallery)</Text>
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

        <TextInput
          style={[styles.input, styles.descriptionInput, { marginTop: 14 }]}
          placeholder="Description"
          placeholderTextColor={appColors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {errorMessage ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.red700} style={{ marginRight: 4 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.saveButton, (isSaving || isDeleting) && styles.saveButtonDisabled]}
          onPress={() => void save()}
          disabled={isSaving || isDeleting}
        >
          {isSaving ? (
            <ActivityIndicator color={appColors.black} />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.deleteButton, (isSaving || isDeleting) && styles.deleteButtonDisabled]}
          onPress={confirmDelete}
          disabled={isSaving || isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={appColors.danger} />
          ) : (
            <View style={styles.deleteButtonContent}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={appColors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.deleteButtonText}>Delete Listing</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>

      <ImageSourceModal
        visible={isImagePickerOpen}
        onClose={() => setIsImagePickerOpen(false)}
        onImageSelected={(img) => setSelectedImage({ uri: img.uri })}
        title="Update Item Photo"
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appColors.background,
  },
  container: {
    padding: 16,
    gap: 10,
  },
  label: {
    color: appColors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  input: {
    backgroundColor: appColors.white,
    borderColor: appColors.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    color: appColors.text,
    fontSize: 13,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: "top",
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
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  imagePickerButton: {
    backgroundColor: appColors.white,
    borderWidth: 1.5,
    borderColor: appColors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerButtonText: {
    color: appColors.primary,
    fontWeight: "700",
    fontSize: 13,
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
  changeImageButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  changeImageText: {
    color: appColors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: appColors.gold,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48,
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: appColors.black,
    fontWeight: "800",
    fontSize: 14,
  },
  navDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appColors.headerControlBg,
    borderWidth: 1,
    borderColor: appColors.headerControlBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    marginTop: 12,
    backgroundColor: appColors.red50,
    borderWidth: 1.5,
    borderColor: appColors.red200,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: appColors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  errorText: {
    color: appColors.danger,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
});
