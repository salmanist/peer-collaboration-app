import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSessionStore } from "../../../core/auth/session";
import { createCollaboration } from "../data/tutoringApi";

import { POPULAR_SKILLS } from "../tutoring";

const CATEGORIES = [
  "Final Year Project (FYP)",
  "Semester Project",
  "Hackathon & Competitions",
  "Research & Study",
];

export function CreateCollaborationScreen() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);


  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState(user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleAddCustomSkill = () => {
    const val = customSkillInput.trim();
    if (val && !selectedSkills.includes(val)) {
      setSelectedSkills([...selectedSkills, val]);
      setCustomSkillInput("");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg("Please enter a project or collaboration title.");
      return;
    }
    if (selectedSkills.length === 0) {
      setErrorMsg("Please select at least one required skill.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Please describe your project and what teammate you are looking for.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createCollaboration({
        title: title.trim(),
        category,
        required_skills: selectedSkills,
        description: description.trim(),
        contact_info: contactInfo.trim(),
      });
      Alert.alert("Success", "Your collaboration request is now live on the board!");
      router.replace("/(app)/tutoring/collaborations");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to post collaboration request.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Post Collaboration Request</Text>
      <Text style={styles.subtitle}>
        Find students with specific skills to collaborate on FYPs, assignments, or hackathons.
      </Text>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.red700} style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Title */}
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Project Title (e.g. Need Flutter Developer for FYP)"
        placeholderTextColor={appColors.textMuted}
      />

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoriesWrap}>
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat;
          return (
            <Pressable
              key={cat}
              style={[styles.catBtn, isSelected && styles.catBtnActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catBtnText, isSelected && styles.catBtnTextActive]}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Required Skills */}
      <Text style={styles.label}>Required Skills (Select or Add)</Text>
      <View style={styles.skillsWrap}>
        {POPULAR_SKILLS.map((skill) => {
          const isSelected = selectedSkills.includes(skill);
          return (
            <Pressable
              key={skill}
              style={[styles.skillPill, isSelected && styles.skillPillSelected]}
              onPress={() => handleToggleSkill(skill)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name={isSelected ? "check" : "plus"}
                  size={13}
                  color={isSelected ? appColors.primary : appColors.textSecondary}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.skillPillText, isSelected && styles.skillPillTextSelected]}>
                  {skill}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Custom Skill Input */}
      <View style={styles.customAddRow}>
        <TextInput
          style={styles.customInput}
          value={customSkillInput}
          onChangeText={setCustomSkillInput}
          placeholder="Add custom skill (e.g. OpenCV, Node.js)..."
          placeholderTextColor={appColors.textMuted}
        />
        <Pressable style={styles.addBtn} onPress={handleAddCustomSkill}>
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {/* Description */}
      <TextInput
        style={[styles.input, styles.textArea, { marginTop: 14 }]}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        placeholder="Project Description & Expectations (what the project is about, role needed...)"
        placeholderTextColor={appColors.textMuted}
      />

      {/* Contact Info */}
      <TextInput
        style={[styles.input, { marginTop: 12 }]}
        value={contactInfo}
        onChangeText={setContactInfo}
        placeholder="Contact Email or Phone (e.g. student@lgu.edu.pk or WhatsApp number)"
        placeholderTextColor={appColors.textMuted}
      />

      {/* Submit Button */}
      <Pressable
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={appColors.white} size="small" />
        ) : (
          <Text style={styles.submitBtnText}>Post to Collaboration Board</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: appColors.text,
  },
  subtitle: {
    fontSize: 13,
    color: appColors.textSecondary,
    marginTop: 2,
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: appColors.red50,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.red300,
    marginBottom: 14,
  },
  errorText: {
    color: appColors.red700,
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: appColors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: appColors.text,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catBtn: {
    backgroundColor: appColors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  catBtnActive: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.primary,
  },
  catBtnText: {
    fontSize: 12,
    color: appColors.textSecondary,
    fontWeight: "500",
  },
  catBtnTextActive: {
    color: appColors.primary,
    fontWeight: "600",
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  skillPill: {
    backgroundColor: appColors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  skillPillSelected: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.icon,
  },
  skillPillText: {
    fontSize: 12,
    color: appColors.textSecondary,
    fontWeight: "500",
  },
  skillPillTextSelected: {
    color: appColors.icon,
    fontWeight: "600",
  },
  customAddRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  customInput: {
    flex: 1,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: appColors.text,
  },
  addBtn: {
    backgroundColor: appColors.border,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  submitBtn: {
    backgroundColor: appColors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: appColors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
