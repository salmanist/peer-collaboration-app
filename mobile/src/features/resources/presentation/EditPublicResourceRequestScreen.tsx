import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchPublicResourceRequest, updatePublicResourceRequest } from "../data/resourcesApi";
import type { ResourceCategory, ResourceExchangeType } from "../resources";

const categories: { value: ResourceCategory; label: string }[] = [
  { value: "notes", label: "Notes" }, { value: "books", label: "Books" }, { value: "stationery", label: "Stationery" }, { value: "lab_equipment", label: "Lab equipment" }, { value: "other", label: "Other" },
];
const exchangeTypes: { value: ResourceExchangeType; label: string }[] = [
  { value: "free", label: "Get free" }, { value: "lend", label: "Borrow" }, { value: "exchange", label: "Exchange" }, { value: "sell", label: "Buy" }, { value: "rent", label: "Rent" },
];

export default function EditPublicResourceRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("notes");
  const [exchangeType, setExchangeType] = useState<ResourceExchangeType>("lend");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadRequest() {
      if (!Number.isInteger(requestId)) {
        setErrorMessage("This request link is invalid.");
        setIsLoading(false);
        return;
      }
      try {
        const request = await fetchPublicResourceRequest(requestId);
        setTitle(request.title); setCourse(request.course); setDescription(request.description);
        setCategory(request.category); setExchangeType(request.desired_exchange_type);
      } catch {
        setErrorMessage("Could not load this request.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadRequest();
  }, [requestId]);

  const save = async () => {
    if (!title.trim() || !description.trim()) {
      setErrorMessage("Title and description are required.");
      return;
    }
    setErrorMessage(""); setIsSaving(true);
    try {
      await updatePublicResourceRequest(requestId, {
        title: title.trim(), course: course.trim(), description: description.trim(), category, desired_exchange_type: exchangeType,
      });
      router.replace("/resources/wanted/mine");
    } catch {
      setErrorMessage("Could not save this request.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1d4ed8" /></View>;
  if (errorMessage && !title) return <View style={styles.centered}><Text style={styles.errorText}>{errorMessage}</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()}><Text style={styles.backLink}>← My Requests</Text></Pressable>
      <Text style={styles.title}>Edit Request</Text>
      <Text style={styles.label}>What do you need? *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>Course (optional)</Text>
      <TextInput style={styles.input} value={course} onChangeText={setCourse} />
      <Text style={styles.label}>Category</Text>
      <Options options={categories} selected={category} onSelect={setCategory} />
      <Text style={styles.label}>I want to</Text>
      <Options options={exchangeTypes} selected={exchangeType} onSelect={setExchangeType} />
      <Text style={styles.label}>Description *</Text>
      <TextInput style={[styles.input, styles.descriptionInput]} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <Pressable style={styles.saveButton} onPress={() => void save()} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveText}>Save changes</Text>}
      </Pressable>
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
