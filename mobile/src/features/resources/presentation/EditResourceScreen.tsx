import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchResourceListing, updateResourceListing } from "../data/resourcesApi";
import type { ResourceCategory, ResourceCondition, ResourceExchangeType } from "../resources";

const categoryOptions: { value: ResourceCategory; label: string }[] = [
  { value: "notes", label: "Notes" }, { value: "books", label: "Books" }, { value: "stationery", label: "Stationery" }, { value: "lab_equipment", label: "Lab equipment" }, { value: "other", label: "Other" },
];
const conditionOptions: { value: ResourceCondition; label: string }[] = [
  { value: "new", label: "New" }, { value: "used", label: "Used" }, { value: "digital", label: "Digital" },
];
const exchangeOptions: { value: ResourceExchangeType; label: string }[] = [
  { value: "free", label: "Free" }, { value: "lend", label: "Lend" }, { value: "exchange", label: "Exchange" }, { value: "sell", label: "Sell" }, { value: "rent", label: "Rent" },
];

export default function EditResourceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Number(id);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("notes");
  const [condition, setCondition] = useState<ResourceCondition>("used");
  const [exchangeType, setExchangeType] = useState<ResourceExchangeType>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadListing() {
      if (!Number.isInteger(listingId)) {
        setErrorMessage("This listing link is invalid.");
        setIsLoading(false);
        return;
      }
      try {
        const listing = await fetchResourceListing(listingId);
        setTitle(listing.title); setCourse(listing.course); setDescription(listing.description);
        setPrice(listing.price ?? ""); setCategory(listing.category); setCondition(listing.condition); setExchangeType(listing.exchange_type);
      } catch {
        setErrorMessage("Could not load this listing.");
      } finally { setIsLoading(false); }
    }
    void loadListing();
  }, [listingId]);

  const save = async () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanPrice = price.trim();
    const isPriced = exchangeType === "sell" || exchangeType === "rent";
    if (!cleanTitle || !cleanDescription) { setErrorMessage("Title and description are required."); return; }
    if (isPriced && (!cleanPrice || Number(cleanPrice) <= 0)) { setErrorMessage("Enter a valid price."); return; }
    setErrorMessage(""); setIsSaving(true);
    try {
      await updateResourceListing(listingId, {
        title: cleanTitle, course: course.trim(), description: cleanDescription, category, condition, exchange_type: exchangeType,
        price: isPriced ? cleanPrice : null,
      });
      router.replace("/resources/listings");
    } catch { setErrorMessage("Could not save this listing. Please check the information."); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1d4ed8" /></View>;
  if (errorMessage && !title) return <View style={styles.centered}><Text style={styles.errorText}>{errorMessage}</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()}><Text style={styles.backLink}>← My Listings</Text></Pressable>
      <Text style={styles.title}>Edit Listing</Text>
      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>Course</Text>
      <TextInput style={styles.input} value={course} onChangeText={setCourse} />
      <Text style={styles.label}>Category</Text>
      <Options options={categoryOptions} selected={category} onSelect={setCategory} />
      <Text style={styles.label}>Condition</Text>
      <Options options={conditionOptions} selected={condition} onSelect={setCondition} />
      <Text style={styles.label}>Offer type</Text>
      <Options options={exchangeOptions} selected={exchangeType} onSelect={setExchangeType} />
      {exchangeType === "sell" || exchangeType === "rent" ? <><Text style={styles.label}>{exchangeType === "rent" ? "Rental price in PKR *" : "Price in PKR *"}</Text><TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" /></> : null}
      <Text style={styles.label}>Description *</Text>
      <TextInput style={[styles.input, styles.descriptionInput]} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <Pressable style={styles.saveButton} onPress={() => void save()} disabled={isSaving}>{isSaving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveText}>Save changes</Text>}</Pressable>
    </ScrollView>
  );
}

function Options<T extends string>({ options, selected, onSelect }: { options: { value: T; label: string }[]; selected: T; onSelect: (value: T) => void }) {
  return <View style={styles.options}>{options.map((option) => <Pressable key={option.value} style={[styles.option, selected === option.value && styles.selectedOption]} onPress={() => onSelect(option.value)}><Text style={[styles.optionText, selected === option.value && styles.selectedOptionText]}>{option.label}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flexGrow: 1, gap: 10, padding: 20, paddingTop: 56, paddingBottom: 36 }, centered: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  backLink: { color: "#1d4ed8", fontWeight: "700", marginBottom: 10 }, title: { color: "#0f172a", fontSize: 26, fontWeight: "700", marginBottom: 6 }, label: { color: "#334155", fontWeight: "700", marginTop: 6 },
  input: { backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: 8, borderWidth: 1, padding: 12 }, descriptionInput: { minHeight: 110 }, options: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, option: { backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: 18, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 }, selectedOption: { backgroundColor: "#dbeafe", borderColor: "#1d4ed8" }, optionText: { color: "#475569" }, selectedOptionText: { color: "#1d4ed8", fontWeight: "700" },
  saveButton: { alignItems: "center", backgroundColor: "#1d4ed8", borderRadius: 8, justifyContent: "center", marginTop: 16, minHeight: 48 }, saveText: { color: "#ffffff", fontWeight: "700" }, errorText: { color: "#b91c1c", marginTop: 6 },
});
