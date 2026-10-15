import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";

import { usePersistentCache } from "../data/PersistentCache";
import { listCourses, type AcademicCourse } from "../network/coursesApi";
import { border, colors, font, radius, spacing, typography } from "./theme";

interface CoursePickerProps {
  label?: string;
  placeholder?: string;
  value: AcademicCourse | null;
  onChange: (course: AcademicCourse) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

// 143 rows, unlike DepartmentPicker's ~16 - same tap-to-open sheet, but with a
// search box up top since scrolling the whole list to find one course isn't
// realistic. Whole list is still cached and fetched once; filtering happens
// client-side against that cached copy, no live network search.
export function CoursePicker({ label, placeholder = "Select course", value, onChange, containerStyle }: CoursePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: courses, isLoading } = usePersistentCache<AcademicCourse[]>("courses", listCourses);

  const filtered = useMemo(() => {
    const list = courses ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
  }, [courses, query]);

  const select = (course: AcademicCourse) => {
    onChange(course);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.field} onPress={() => setIsOpen(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText} numberOfLines={1}>
          {value ? `${value.code} — ${value.title}` : placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search course code or name"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : (
            <ScrollView bounces={false} showsVerticalScrollIndicator>
              {filtered.map((course) => (
                <Pressable key={course.id} style={styles.row} onPress={() => select(course)}>
                  <Text style={styles.rowText} numberOfLines={1}>{course.title}</Text>
                  <Text style={styles.rowCode}>{course.code}</Text>
                </Pressable>
              ))}
              {filtered.length === 0 && <Text style={styles.empty}>No matching courses.</Text>}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textSecondary, marginBottom: spacing.xs },
  field: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: border.thin,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  valueText: { flexShrink: 1, fontSize: typography.size.base, fontFamily: font.familyRegular, color: colors.text },
  placeholderText: { flexShrink: 1, fontSize: typography.size.base, fontFamily: font.familyRegular, color: colors.textMuted },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    top: "15%",
    maxHeight: "70%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: border.thin,
    borderColor: colors.border,
    overflow: "hidden",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: border.thin,
    borderBottomColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.text, height: 36 },
  loading: { padding: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: border.thin,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.text },
  rowCode: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textMuted },
  empty: { padding: spacing.lg, fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, textAlign: "center" },
});
