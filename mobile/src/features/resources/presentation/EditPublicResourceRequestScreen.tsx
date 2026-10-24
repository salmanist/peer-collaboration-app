import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { deletePublicResourceRequest, fetchPublicResourceRequest, updatePublicResourceRequest } from "../data/resourcesApi";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

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

  const confirmDelete = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to delete this request? This action cannot be undone.");
      if (confirmed) {
        void handleDelete();
      }
    } else {
      Alert.alert(
        "Delete Request",
        "Are you sure you want to delete this request? This action cannot be undone.",
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
      await deletePublicResourceRequest(requestId);
      router.replace("/resources/wanted/mine");
    } catch {
      setErrorMessage("Could not delete this request. Please try again.");
      setIsDeleting(false);
    }
  };

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
        <LoadingSkeleton variant="form" />
      </View>
    );
  }

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
        <Text style={styles.topNavTitle}>Edit Request</Text>
        <Pressable
          style={styles.navDeleteBtn}
          onPress={confirmDelete}
          disabled={isDeleting || isSaving}
          accessibilityLabel="Delete Request"
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
          placeholder="What do you need? (e.g. Data Structures & Algorithms)"
          placeholderTextColor={appColors.textMuted}
        />

        <TextInput
          style={[styles.input, { marginTop: 12 }]}
          value={course}
          onChangeText={setCourse}
          placeholder="Course Code (optional, e.g. CS-302)"
          placeholderTextColor={appColors.textMuted}
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
              <Text style={styles.deleteButtonText}>Delete Request</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  optionPillSelected: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.primary,
  },
  optionPillIcon: {
    fontSize: 12,
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
