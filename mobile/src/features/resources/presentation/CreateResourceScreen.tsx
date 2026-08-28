import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
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

import { useDataStore } from "../../../core/store/DataStoreContext";
import { createResourceListing } from "../data/resourcesApi";
import type {
  ResourceCategory,
  ResourceCondition,
  ResourceExchangeType,
} from "../resources";

const categoryOptions: { value: ResourceCategory; label: string }[] = [
  { value: "notes", label: "Notes" },
  { value: "books", label: "Books" },
  { value: "stationery", label: "Stationery" },
  { value: "lab_equipment", label: "Lab equipment" },
  { value: "other", label: "Other" },
];

const conditionOptions: { value: ResourceCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "digital", label: "Digital" },
];

const exchangeOptions: { value: ResourceExchangeType; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "lend", label: "Lend" },
  { value: "exchange", label: "Exchange" },
  { value: "sell", label: "Sell" },
  { value: "rent", label: "Rent" },
];

function getCreateErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "Could not add the resource. Please try again.";
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
  const { invalidateResourceListings } = useDataStore();
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [category, setCategory] = useState<ResourceCategory>("notes");
  const [condition, setCondition] = useState<ResourceCondition>("used");
  const [exchangeType, setExchangeType] = useState<ResourceExchangeType>("free");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanPrice = price.trim();

    if (!cleanTitle || !cleanDescription) {
      setErrorMessage("Title and description are required.");
      return;
    }

    if ((exchangeType === "sell" || exchangeType === "rent") && (!cleanPrice || Number(cleanPrice) <= 0)) {
      setErrorMessage("Enter a valid price.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
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
      <View style={[styles.topNavBar, { paddingTop: topOffset + 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>Share a Resource</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Post Marketplace Ad</Text>
          <Text style={styles.subtitle}>
            List items, books, hostel essentials, or student supplies with fellow LGU students.
          </Text>
        </View>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Database Systems 6th Edition / Midterm Notes"
          placeholderTextColor="#94a3b8"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Course Code (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. CS-301, SE-204"
          placeholderTextColor="#94a3b8"
          value={course}
          onChangeText={setCourse}
        />

        <Text style={styles.label}>Category</Text>
        <OptionGroup options={categoryOptions} selectedValue={category} onSelect={setCategory} />

        <Text style={styles.label}>Condition</Text>
        <OptionGroup options={conditionOptions} selectedValue={condition} onSelect={setCondition} />

        <Text style={styles.label}>Sharing Type</Text>
        <OptionGroup options={exchangeOptions} selectedValue={exchangeType} onSelect={setExchangeType} />

        {(exchangeType === "sell" || exchangeType === "rent") && (
          <>
            <Text style={styles.label}>
              {exchangeType === "rent" ? "Rental Price in PKR *" : "Price in PKR *"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              placeholderTextColor="#94a3b8"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </>
        )}

        <Text style={styles.label}>Item Description *</Text>
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Describe edition, chapters covered, condition, or meetup location..."
          placeholderTextColor="#94a3b8"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Photo (optional)</Text>
        {selectedImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
            <Pressable style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="close" size={14} color="#B91C1C" style={{ marginRight: 4 }} />
                <Text style={styles.removeImageText}>Remove Photo</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.imagePickerButton} onPress={() => void pickImage()}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="camera-plus-outline" size={18} color="#0D3E02" style={{ marginRight: 6 }} />
              <Text style={styles.imagePickerButtonText}>Add Item Photo</Text>
            </View>
          </Pressable>
        )}

        {errorMessage ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 4 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.submitButtonText}>Publish Resource</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function OptionGroup<T extends string>({
  options,
  selectedValue,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selectedValue: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.optionGroup}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[styles.option, selectedValue === option.value && styles.optionSelected]}
          onPress={() => onSelect(option.value)}
        >
          <Text style={[styles.optionText, selectedValue === option.value && styles.optionTextSelected]}>
            {selectedValue === option.value ? `✓ ${option.label}` : option.label}
          </Text>
        </Pressable>
      ))}
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
  container: {
    padding: 16,
    gap: 10,
  },
  header: {
    marginBottom: 8,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#070D1F",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    color: "#070D1F",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 12,
    color: "#070D1F",
    fontSize: 14,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: "top",
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
    fontSize: 14,
  },
  imagePreviewContainer: {
    alignItems: "center",
    gap: 8,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    resizeMode: "cover",
  },
  removeImageButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
  },
  removeImageText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 13,
  },
  optionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#0D3E02",
  },
  optionText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#0D3E02",
    fontWeight: "800",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: "#FDBF1E",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
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
