import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";

import { Button, Card, DepartmentPicker, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import { usePersistentCache } from "../../../core/data/PersistentCache";
import { listDepartments, type Department } from "../../../core/network/departmentsApi";
import { getLibraryProject, updateLibraryProject, type LibraryProjectLevel } from "../data/libraryApi";
import { LevelPicker } from "./LevelPicker";

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = Number(id);

  const { data: departments } = usePersistentCache<Department[]>("departments", listDepartments);

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<Department | null>(null);
  const [departmentCode, setDepartmentCode] = useState<string | null>(null);
  const [abstract, setAbstract] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [level, setLevel] = useState<LibraryProjectLevel>("simple");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetches the project exactly once - department resolution below is a separate
  // effect so it doesn't matter which of the two (project fetch vs. the persistent
  // departments cache) finishes loading first, and the project never gets re-fetched
  // just because the department list happened to arrive later.
  useEffect(() => {
    getLibraryProject(projectId)
      .then((project) => {
        setTitle(project.title);
        setAbstract(project.abstract);
        setGithubLink(project.github_link);
        setLevel(project.level);
        // Wire format is a plain short_name string (e.g. "CS") - resolved against
        // the canonical list below once both pieces are available.
        setDepartmentCode(project.department);
      })
      .catch(() => setError("Couldn't load this project."))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!departmentCode || !departments) return;
    const match = departments.find((d) => d.short_name === departmentCode);
    if (match) setDepartment(match);
  }, [departmentCode, departments]);

  const handleSave = async () => {
    if (!title.trim() || !department || !abstract.trim()) {
      setError("Please fill in every field.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await updateLibraryProject(projectId, {
        title: title.trim(),
        department: department.short_name,
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
      <ScreenContainer center back="/(app)/library/my-projects">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll back="/(app)/library/my-projects">
      <Text style={styles.title}>Edit Project</Text>

      <Card contentStyle={styles.card}>
        <TextField label="Title" placeholder="Project title" value={title} onChangeText={setTitle} />
        <DepartmentPicker label="Department" value={department} onChange={setDepartment} />
        <TextField
          label="Abstract"
          placeholder="Summarize the project in a few sentences"
          value={abstract}
          onChangeText={setAbstract}
          multiline
          numberOfLines={4}
          style={styles.abstractInput}
        />
        <TextField
          label="GitHub Repo Link (optional)"
          placeholder="https://github.com/your-username/your-project"
          value={githubLink}
          onChangeText={setGithubLink}
          autoCapitalize="none"
          keyboardType="url"
        />
        <LevelPicker label="Project Level" value={level} onChange={setLevel} />

        <Text style={styles.hint}>Saving sends this project back to moderation for re-review.</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Save Changes" onPress={handleSave} loading={isSaving} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginBottom: spacing.md },
  card: { gap: spacing.lg },
  abstractInput: { height: 100, paddingTop: spacing.sm, textAlignVertical: "top" },
  hint: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted, lineHeight: 18 },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
});
