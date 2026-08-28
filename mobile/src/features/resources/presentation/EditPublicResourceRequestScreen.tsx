import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import { fetchPublicResourceRequest, updatePublicResourceRequest } from "../data/resourcesApi";
import type { ResourceCategory, ResourceExchangeType } from "../resources";

const categories: { value: ResourceCategory; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: "notes", label: "Course Notes", icon: "file-document-edit-outline" },
  { value: "books", label: "Textbooks", icon: "book-open-page-variant" },
  { value: "stationery", label: "Stationery", icon: "ruler-square" },
  { value: "lab_equipment", label: "Lab Gear", icon: "flask-outline" },
  { value: "other", label: "Other Supplies", icon: "package-variant-closed" },
];

const exchangeTypes: { value: ResourceExchangeType; label: string }[] = [
  { value: "free", label: "Get Free" },
  { value: "lend", label: "Borrow" },
  { value: "exchange", label: "Exchange" },
  { value: "sell", label: "Buy" },
  { value: "rent", label: "Rent" },
];

export default function EditPublicResourceRequestScreen() {
  const insets = useSafeAreaInsets();
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

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  useEffect(() => {
    async function loadRequest() {
      if (!Number.isInteger(requestId)) {
        setErrorMessage("This request link is invalid.");
        setIsLoading(false);
        return;
      }
      try {
        const request = await fetchPublicResourceRequest(requestId);
        setTitle(request.title);
        setCourse(request.course || "");
        setDescription(request.description);
        setCategory(request.category);
        setExchangeType(request.desired_exchange_type);
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
    setErrorMessage("");
    setIsSaving(true);
    try {
      await updatePublicResourceRequest(requestId, {
        title: title.trim(),
        course: course.trim(),
        description: description.trim(),
        category,
        desired_exchange_type: exchangeType,
      });
      router.replace("/resources/wanted/mine");
    } catch {
      setErrorMessage("Could not save this request.");
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
        <Text style={styles.topNavTitle}>Edit Request</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>What do you need? *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Data Structures & Algorithms"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Course Code (optional)</Text>
        <TextInput
          style={styles.input}
          value={course}
          onChangeText={setCourse}
          placeholder="e.g. CS-302"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.optionsWrap}>
          {categories.map((cat) => {
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
                    color={isSelected ? "#0D3E02" : "#64748b"}
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

        <Text style={styles.label}>I want to</Text>
        <View style={styles.optionsWrap}>
          {exchangeTypes.map((type) => {
            const isSelected = exchangeType === type.value;
            return (
              <Pressable
                key={type.value}
                style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                onPress={() => setExchangeType(type.value)}
              >
                <Text style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}>
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  optionPillSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#0D3E02",
  },
  optionPillIcon: {
    fontSize: 12,
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
