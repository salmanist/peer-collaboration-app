import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { createPublicResourceRequest } from "../data/resourcesApi";
import type { ResourceCategory, ResourceExchangeType } from "../resources";

const categories: { value: ResourceCategory; label: string }[] = [
  { value: "notes", label: "Notes" }, { value: "books", label: "Books" }, { value: "stationery", label: "Stationery" }, { value: "lab_equipment", label: "Lab equipment" }, { value: "other", label: "Other" },
];
const exchangeTypes: { value: ResourceExchangeType; label: string }[] = [
  { value: "free", label: "Get free" }, { value: "lend", label: "Borrow" }, { value: "exchange", label: "Exchange" }, { value: "sell", label: "Buy" }, { value: "rent", label: "Rent" },
];

export default function CreatePublicResourceRequestScreen() {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("notes");
  const [exchangeType, setExchangeType] = useState<ResourceExchangeType>("lend");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      setErrorMessage("Title and description are required.");
      return;
    }
    setErrorMessage(""); setIsSubmitting(true);
    try {
      await createPublicResourceRequest({ title: title.trim(), course: course.trim() || undefined, description: description.trim(), category, desired_exchange_type: exchangeType });
      router.replace("/resources/wanted/mine");
    } catch {
      setErrorMessage("Could not publish your resource request.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()}><Text style={styles.backLink}>← Back</Text></Pressable>
      <Text style={styles.title}>Request a Resource</Text>
      <Text style={styles.subtitle}>Tell other students what you need.</Text>
      <Text style={styles.label}>What do you need? *</Text>
      <TextInput style={styles.input} placeholder="e.g. Data Structures textbook" value={title} onChangeText={setTitle} />
      <Text style={styles.label}>Course (optional)</Text>
      <TextInput style={styles.input} placeholder="e.g. CS-302" value={course} onChangeText={setCourse} />
      <Text style={styles.label}>Category</Text>
      <Options options={categories} selected={category} onSelect={setCategory} />
      <Text style={styles.label}>I want to</Text>
      <Options options={exchangeTypes} selected={exchangeType} onSelect={setExchangeType} />
      <Text style={styles.label}>Description *</Text>
      <TextInput style={[styles.input, styles.descriptionInput]} placeholder="Add details such as edition, time needed, or preferred condition." value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <Pressable style={styles.submitButton} onPress={() => void submit()} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>Publish request</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Options<T extends string>({ options, selected, onSelect }: { options: { value: T; label: string }[]; selected: T; onSelect: (value: T) => void }) {
  return <View style={styles.options}>{options.map((option) => <Pressable key={option.value} style={[styles.option, selected === option.value && styles.selectedOption]} onPress={() => onSelect(option.value)}><Text style={[styles.optionText, selected === option.value && styles.selectedOptionText]}>{option.label}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flexGrow: 1, gap: 10, padding: 20, paddingTop: 56, paddingBottom: 36 }, backLink: { color: "#1d4ed8", fontWeight: "700", marginBottom: 10 },
  title: { color: "#0f172a", fontSize: 26, fontWeight: "700" }, subtitle: { color: "#64748b", marginBottom: 8 }, label: { color: "#334155", fontWeight: "700", marginTop: 6 },
  input: { backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: 8, borderWidth: 1, padding: 12 }, descriptionInput: { minHeight: 110 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, option: { backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: 18, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 }, selectedOption: { backgroundColor: "#dbeafe", borderColor: "#1d4ed8" }, optionText: { color: "#475569" }, selectedOptionText: { color: "#1d4ed8", fontWeight: "700" },
  submitButton: { alignItems: "center", backgroundColor: "#1d4ed8", borderRadius: 8, marginTop: 16, minHeight: 48, justifyContent: "center" }, submitText: { color: "#ffffff", fontWeight: "700" }, errorText: { color: "#b91c1c", marginTop: 6 },
});
