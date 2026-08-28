import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

import { fetchResourceListing, updateResourceListing } from "../data/resourcesApi";
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
  { value: "digital", label: "Digital Copy" },
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
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<ResourceCategory>("notes");
  const [condition, setCondition] = useState<ResourceCondition>("used");
  const [exchangeType, setExchangeType] = useState<ResourceExchangeType>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage({ uri: result.assets[0].uri });
      }
    } catch {
      setErrorMessage("Could not open image picker.");
    }
  };

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
        <ActivityIndicator size="large" color="#0D3E02" />
      </View>
    );
  }

  const displayImageUri = selectedImage ? selectedImage.uri : existingImageUrl;

  return (
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset + 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>Edit Resource</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Resource title"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Course Code (optional)</Text>
        <TextInput
          style={styles.input}
          value={course}
          onChangeText={setCourse}
          placeholder="e.g. CS-301"
          placeholderTextColor="#94a3b8"
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
          <>
            <Text style={styles.label}>
              {exchangeType === "rent" ? "Rental Price in PKR *" : "Price in PKR *"}
            </Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="e.g. 500"
              placeholderTextColor="#94a3b8"
            />
          </>
        ) : null}

        <Text style={styles.label}>Photo (optional)</Text>
        {displayImageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: displayImageUri }} style={styles.imagePreview} />
            <Pressable style={styles.changeImageButton} onPress={() => void pickImage()}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="camera-retake-outline" size={16} color="#0D3E02" style={{ marginRight: 6 }} />
                <Text style={styles.changeImageText}>Change Photo</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.imagePickerButton} onPress={() => void pickImage()}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="camera-plus-outline" size={18} color="#0D3E02" style={{ marginRight: 6 }} />
              <Text style={styles.imagePickerButtonText}>Add Photo (optional)</Text>
            </View>
          </Pressable>
        )}

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {errorMessage ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 4 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={() => void save()}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.saveText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFC",
  },
  container: {
    padding: 16,
    gap: 10,
  },
  label: {
    color: "#070D1F",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    color: "#070D1F",
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
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionPillSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#0D3E02",
  },
  optionPillText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  optionPillTextSelected: {
    color: "#0D3E02",
    fontWeight: "800",
  },
  imagePickerButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#0D3E02",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerButtonText: {
    color: "#0D3E02",
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
    color: "#0D3E02",
    fontWeight: "700",
    fontSize: 13,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#FDBF1E",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 14,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
});
