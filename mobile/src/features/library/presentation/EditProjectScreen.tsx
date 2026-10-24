import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DepartmentDropdown } from "../../../core/components/DepartmentDropdown";
import { getLibraryProject, updateLibraryProject, type LibraryProjectLevel } from "../data/libraryApi";

const LEVELS: { value: LibraryProjectLevel; label: string }[] = [
  { value: "simple", label: "Simple Project" },
  { value: "semester", label: "Semester Project" },
  { value: "fyp", label: "Final Year Project (FYP)" },
];

export default function EditProjectScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = Number(id);

  const [title, setTitle] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [departmentShort, setDepartmentShort] = useState("");
  const [abstract, setAbstract] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [level, setLevel] = useState<LibraryProjectLevel>("simple");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  useEffect(() => {
    getLibraryProject(projectId)
      .then((project) => {
        setTitle(project.title);
        setAbstract(project.abstract);
        setGithubLink(project.github_link || "");
        setLevel(project.level);
        setDepartmentShort(project.department);
        setDepartmentName(project.department);
      })
      .catch(() => setError("Couldn't load this project."))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const handleSave = async () => {
    if (!title.trim() || !departmentShort || !abstract.trim()) {
      setError("Please fill in every field.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await updateLibraryProject(projectId, {
        title: title.trim(),
        department: departmentShort,
        abstract: abstract.trim(),
        githubLink: githubLink.trim(),
        level,
      });
      router.replace(`/(app)/library/${projectId}`);
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" ") : "Couldn't save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.rootContainer}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/library")}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
          </Pressable>
          <Text style={styles.topNavTitle}>Edit Project</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <LoadingSkeleton variant="form" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/library")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>Edit Project</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Project Title"
              placeholderTextColor={appColors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Department *</Text>
            <DepartmentDropdown
              selectedDepartment={departmentName}
              onSelectDepartment={(deptName, deptObj) => {
                setDepartmentName(deptName);
                setDepartmentShort(deptObj?.short_name || deptName);
              }}
              placeholder="Select Department"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Level</Text>
            <View style={styles.levelPillsRow}>
              {LEVELS.map((lvl) => {
                const isSelected = level === lvl.value;
                return (
                  <Pressable
                    key={lvl.value}
                    style={[styles.levelPill, isSelected && styles.levelPillActive]}
                    onPress={() => setLevel(lvl.value)}
                  >
                    <Text style={[styles.levelPillText, isSelected && styles.levelPillTextActive]}>
                      {lvl.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Abstract / Summary"
              placeholderTextColor={appColors.textMuted}
              value={abstract}
              onChangeText={setAbstract}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.iconInputRow}>
              <MaterialCommunityIcons name="github" size={20} color={appColors.textSecondary} style={{ marginLeft: 12 }} />
              <TextInput
                style={[styles.input, styles.iconInputField]}
                placeholder="GitHub Repository Link (https://github.com/...)"
                placeholderTextColor={appColors.textMuted}
                value={githubLink}
                onChangeText={setGithubLink}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          <View style={styles.verifiedBox}>
            <MaterialCommunityIcons name="information-outline" size={18} color={appColors.amber700} style={{ marginRight: 8 }} />
            <Text style={styles.verifiedText}>
              Saving changes sends this project back to moderation queue for verification.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryBtn, isSaving && styles.primaryBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={appColors.black} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.white,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    borderBottomWidth: 1,
    borderBottomColor: appColors.headerBg,
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
    fontSize: 16,
    fontWeight: "800",
    color: appColors.onHeader,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formContainer: {
    width: "100%",
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  input: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    fontSize: 14,
    color: appColors.text,
  },
  textArea: {
    minHeight: 90,
  },
  iconInputRow: {
    flexDirection: "row",
    alignItems: "center",




  },
  iconInputField: {
    flex: 1,


  },
  levelPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  levelPill: {
    backgroundColor: appColors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  levelPillActive: {
    backgroundColor: appColors.primary,
    borderColor: appColors.primary,
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  levelPillTextActive: {
    color: appColors.white,
    fontWeight: "700",
  },
  verifiedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.amber50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.amber200,
  },
  verifiedText: {
    flex: 1,
    fontSize: 12,
    color: appColors.icon,
    fontWeight: "500",
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.red50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: appColors.danger,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: appColors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: appColors.black,
    fontSize: 14,
    fontWeight: "800",
  },
});
