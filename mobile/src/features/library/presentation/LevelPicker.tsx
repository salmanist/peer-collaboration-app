import { Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, colors, font, spacing, typography } from "../../../core/ui";
import type { LibraryProjectLevel } from "../data/libraryApi";

const LEVELS: { value: LibraryProjectLevel; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "semester", label: "Semester Project" },
  { value: "fyp", label: "FYP" },
];

// Shared with every screen that renders a project card - "simple" is
// deliberately absent here, callers check for it and render no badge at all.
// Tones picked to stay visually distinct from each other AND from the
// pending/approved/rejected status badges shown alongside them on
// MyProjectsScreen (warning/success/danger) - note Badge's "primary" tone is
// the same sage as "tertiary" in this theme (both alias colors.primaryFixed),
// so semester/FYP can't use that pairing.
export const levelBadge: Partial<Record<LibraryProjectLevel, { label: string; tone: "tertiary" | "secondary" }>> = {
  semester: { label: "Semester Project", tone: "tertiary" },
  fyp: { label: "FYP", tone: "secondary" },
};

interface LevelPickerProps {
  label: string;
  value: LibraryProjectLevel;
  onChange: (level: LibraryProjectLevel) => void;
}

// Same selectable-chip pattern LibraryListScreen already uses for department
// filters - pick one of a small fixed set, active choice tinted, rest neutral.
export function LevelPicker({ label, value, onChange }: LevelPickerProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {LEVELS.map((level) => (
          <Pressable key={level.value} onPress={() => onChange(level.value)}>
            <Badge label={level.label} tone={value === level.value ? "secondary" : "neutral"} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textSecondary, marginBottom: spacing.xs },
  row: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
});
