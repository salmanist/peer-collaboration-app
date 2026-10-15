import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";

import { Button, Card, CoursePicker, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import { usePersistentCache } from "../../../core/data/PersistentCache";
import { listCourses, type AcademicCourse } from "../../../core/network/coursesApi";
import { getNote, updateNote } from "../data/notesApi";

export default function EditNoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = Number(id);

  const { data: courses } = usePersistentCache<AcademicCourse[]>("courses", listCourses);

  const [title, setTitle] = useState("");
  const [course, setCourse] = useState<AcademicCourse | null>(null);
  const [courseCode, setCourseCode] = useState<string | null>(null);
  const [semester, setSemester] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Same two-effect split as EditProjectScreen - the note fetch and the
  // course-code resolution against the cached course list don't need to wait
  // on each other.
  useEffect(() => {
    getNote(noteId)
      .then((note) => {
        setTitle(note.title);
        setSemester(note.semester);
        setDescription(note.description);
        setCourseCode(note.course);
      })
      .catch(() => setError("Couldn't load these notes."))
      .finally(() => setIsLoading(false));
  }, [noteId]);

  useEffect(() => {
    if (!courseCode || !courses) return;
    const match = courses.find((c) => c.code === courseCode);
    if (match) setCourse(match);
  }, [courseCode, courses]);

  const handleSave = async () => {
    if (!title.trim() || !course) {
      setError("Please fill in the title and course.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await updateNote(noteId, {
        title: title.trim(),
        course: course.code,
        semester: semester.trim(),
        description: description.trim(),
      });
      router.replace(`/(app)/library/notes/${noteId}`);
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" ") : "Couldn't save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer center back="/(app)/library/notes/mine">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll back="/(app)/library/notes/mine">
      <Text style={styles.title}>Edit Notes</Text>

      <Card contentStyle={styles.card}>
        <TextField label="Heading" placeholder="What are these notes about?" value={title} onChangeText={setTitle} />
        <CoursePicker label="Course" value={course} onChange={setCourse} />
        <TextField label="Semester (optional)" placeholder="e.g. Fall 2025" value={semester} onChangeText={setSemester} />
        <TextField
          label="Description (optional)"
          placeholder="Summarize what's covered"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={styles.descriptionInput}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Save Changes" onPress={handleSave} loading={isSaving} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginBottom: spacing.md },
  card: { gap: spacing.lg },
  descriptionInput: { height: 100, paddingTop: spacing.sm, textAlignVertical: "top" },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
});
