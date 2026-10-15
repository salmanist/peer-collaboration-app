import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { TextField, border, colors, font, radius, spacing, typography } from "../../../core/ui";
import { searchLocations, type RideLocation } from "../data/ridesApi";

const DEBOUNCE_MS = 250;
// Closing on blur races the suggestion's own onPress on RN Web (blur fires first
// and unmounts the list before the tap registers) — a short delay lets the tap win.
const BLUR_CLOSE_DELAY_MS = 150;

interface LocationAutocompleteProps {
  label: string;
  placeholder?: string;
  value: RideLocation | null;
  onChange: (location: RideLocation | null) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

// Departure/destination must be picked from the curated Location table, never
// typed freely — this renders as a normal text field, but typing only searches;
// selecting a suggestion is the only way to actually set a value.
export function LocationAutocomplete({ label, placeholder, value, onChange, containerStyle }: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<RideLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = (text: string) => {
    setQuery(text);
    onChange(null);
    setIsOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = text.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        setResults(await searchLocations(trimmed));
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const handleSelect = (location: RideLocation) => {
    setQuery(location.name);
    onChange(location);
    setResults([]);
    setIsOpen(false);
  };

  return (
    <View style={containerStyle}>
      <TextField
        label={label}
        placeholder={placeholder}
        value={query}
        onChangeText={handleChangeText}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), BLUR_CLOSE_DELAY_MS)}
      />
      {isOpen && (isLoading || results.length > 0) && (
        <View style={styles.dropdown}>
          {isLoading ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : (
            results.map((item) => (
              <Pressable key={item.id} style={styles.row} onPress={() => handleSelect(item)}>
                <Text style={styles.rowText}>{item.name}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderWidth: border.thin,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  loading: { paddingVertical: spacing.sm },
  row: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rowText: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.text },
});
