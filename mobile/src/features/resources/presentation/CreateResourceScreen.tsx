import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
      router.replace("/resources");
    } catch (error) {
      setErrorMessage(getCreateErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Add a resource</Text>
        <Text style={styles.subtitle}>Share an item with other LGU students.</Text>
      </View>

      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Database Systems notes"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Course (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. CS-301"
        value={course}
        onChangeText={setCourse}
      />

      <Text style={styles.label}>Category</Text>
      <OptionGroup options={categoryOptions} selectedValue={category} onSelect={setCategory} />

      <Text style={styles.label}>Condition</Text>
      <OptionGroup options={conditionOptions} selectedValue={condition} onSelect={setCondition} />

      <Text style={styles.label}>Sharing type</Text>
      <OptionGroup options={exchangeOptions} selectedValue={exchangeType} onSelect={setExchangeType} />

      {(exchangeType === "sell" || exchangeType === "rent") && (
        <>
          <Text style={styles.label}>{exchangeType === "rent" ? "Rental price in PKR *" : "Price in PKR *"}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </>
      )}

      <Text style={styles.label}>Photo (optional)</Text>
      {selectedImage ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
          <Pressable style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
            <Text style={styles.removeImageText}>✕ Remove photo</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.imagePickerButton} onPress={() => void pickImage()}>
          <Text style={styles.imagePickerButtonText}>📷 Add a photo (optional)</Text>
        </Pressable>
      )}

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.descriptionInput]}
        placeholder="Describe the resource, edition, condition, or anything a student should know."
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable style={styles.submitButton} onPress={() => void handleSubmit()} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitButtonText}>Publish resource</Text>}
      </Pressable>
    </ScrollView>
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
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 56, paddingBottom: 40, backgroundColor: "#f8fafc", gap: 10 },
  header: { marginBottom: 8, gap: 5 },
  backLink: { color: "#1d4ed8", fontWeight: "700", marginBottom: 10 },
  title: { fontSize: 26, fontWeight: "700", color: "#0f172a" },
  subtitle: { color: "#64748b", lineHeight: 20 },
  label: { color: "#334155", fontWeight: "700", marginTop: 8 },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 12, color: "#0f172a" },
  descriptionInput: { minHeight: 120 },
  imagePickerButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerButtonText: { color: "#1d4ed8", fontWeight: "600" },
  imagePreviewContainer: { alignItems: "center", gap: 8 },
  imagePreview: { width: "100%", height: 200, borderRadius: 8, resizeMode: "cover" },
  removeImageButton: { alignSelf: "flex-end", paddingVertical: 4 },
  removeImageText: { color: "#b91c1c", fontWeight: "600", fontSize: 13 },
  optionGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  optionSelected: { backgroundColor: "#dbeafe", borderColor: "#1d4ed8" },
  optionText: { color: "#475569" },
  optionTextSelected: { color: "#1d4ed8", fontWeight: "700" },
  errorText: { color: "#b91c1c", marginTop: 6 },
  submitButton: { backgroundColor: "#1d4ed8", borderRadius: 8, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 14 },
  submitButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
});

