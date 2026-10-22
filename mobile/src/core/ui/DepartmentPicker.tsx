import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { Text } from "./AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { usePersistentCache } from "../data/PersistentCache";
import { listDepartments, type Department } from "../network/departmentsApi";
import { border, colors, font, radius, spacing, typography } from "./theme";

interface DepartmentPickerProps {
  label?: string;
  placeholder?: string;
  value: Department | null;
  onChange: (department: Department | null) => void;
  containerStyle?: StyleProp<ViewStyle>;
  // Adds a leading row in the list that clears the selection (onChange(null)) -
  // a real, needed state for a filter ("show every department again"), unlike
  // the required-field upload/edit forms, which don't pass this.
  clearable?: boolean;
  clearLabel?: string;
}

// Departments must be picked from the Department table, never typed freely — a short,
// rarely-changing list, so a tap-to-open modal list fits better than a search-as-you-type
// field (compare LocationAutocomplete, built for a much larger, typeahead-worthy list).
export function DepartmentPicker({
  label,
  placeholder = "Select department",
  value,
  onChange,
  containerStyle,
  clearable,
  clearLabel = "All Departments",
}: DepartmentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Same persistent cache/key as LibraryListScreen's department filter - shares
  // the on-device copy, so by the time this picker is actually opened the list
  // is very likely already there with no spinner at all.
  const { data: departments, isLoading } = usePersistentCache<Department[]>("departments", listDepartments);

  const select = (department: Department | null) => {
    onChange(department);
    setIsOpen(false);
  };

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.field} onPress={() => setIsOpen(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText} numberOfLines={1}>
          {value ? value.name : placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)} />
        <View style={styles.sheet}>
          {isLoading ? (
            <LoadingSkeleton variant="list" count={2} />
          ) : (
            <ScrollView bounces={false} showsVerticalScrollIndicator>
              {clearable && (
                <Pressable style={styles.row} onPress={() => select(null)}>
                  <Text style={styles.rowText}>{clearLabel}</Text>
                </Pressable>
              )}
              {(departments ?? []).map((department) => (
                <Pressable key={department.id} style={styles.row} onPress={() => select(department)}>
                  <Text style={styles.rowText}>{department.name}</Text>
                  <Text style={styles.rowShort}>{department.short_name}</Text>
                </Pressable>
              ))}
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
    top: "25%",
    maxHeight: "50%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: border.thin,
    borderColor: colors.border,
    overflow: "hidden",
  },
  loading: { padding: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: border.thin,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.text },
  rowShort: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textMuted },
});
