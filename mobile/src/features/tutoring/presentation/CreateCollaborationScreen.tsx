import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Title */}
      <Text style={styles.label}>Project Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Need Flutter Developer for Smart Campus FYP"
        placeholderTextColor="#94a3b8"
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
                  color={isSelected ? "#0D3E02" : "#475569"}
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
          placeholderTextColor="#94a3b8"
        />
        <Pressable style={styles.addBtn} onPress={handleAddCustomSkill}>
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {/* Description */}
      <Text style={styles.label}>Project Description & Expectations</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        placeholder="Describe what the project is about, current progress, and what role the collaborator will take..."
        placeholderTextColor="#94a3b8"
      />

      {/* Contact Info */}
      <Text style={styles.label}>Contact Email or Phone</Text>
      <TextInput
        style={styles.input}
        value={contactInfo}
        onChangeText={setContactInfo}
        placeholder="e.g. student@lgu.edu.pk or WhatsApp number"
        placeholderTextColor="#94a3b8"
      />

      {/* Submit Button */}
      <Pressable
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" size="small" />
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
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fca5a5",
    marginBottom: 14,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
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
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  catBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#1d4ed8",
  },
  catBtnText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  catBtnTextActive: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  skillPill: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  skillPillSelected: {
    backgroundColor: "#f0fdf4",
    borderColor: "#16a34a",
  },
  skillPillText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  skillPillTextSelected: {
    color: "#16a34a",
    fontWeight: "600",
  },
  customAddRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  customInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0f172a",
  },
  addBtn: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  submitBtn: {
    backgroundColor: "#1d4ed8",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
