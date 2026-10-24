import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { searchLocations, type RideLocation } from "../data/ridesApi";

const DEBOUNCE_MS = 250;
const BLUR_CLOSE_DELAY_MS = 200;

export interface LocationAutocompleteProps {
  label?: string;
  placeholder?: string;
  value?: RideLocation | null;
  onChange?: (location: RideLocation | null) => void;
  textValue?: string;
  onTextChange?: (text: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
}

export function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  textValue,
  onTextChange,
  containerStyle,
  labelStyle,
  inputContainerStyle,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(textValue ?? value?.name ?? "");
  const [results, setResults] = useState<RideLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (textValue !== undefined) {
      setQuery(textValue);
    } else if (value !== undefined) {
      setQuery(value?.name ?? "");
    }
  }, [textValue, value]);

  const fetchSuggestions = async (searchText: string) => {
    setIsLoading(true);
    try {
      const data = await searchLocations(searchText);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    onTextChange?.(text);
    onChange?.(null);
    setIsOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, DEBOUNCE_MS);
  };

  const handleFocus = () => {
    setIsOpen(true);
    fetchSuggestions(query);
  };

  const handleSelect = (location: RideLocation) => {
    setQuery(location.name);
    onTextChange?.(location.name);
    onChange?.(location);
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    onTextChange?.("");
    onChange?.(null);
    setResults([]);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {!!label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
      <View style={[styles.inputContainer, inputContainerStyle]}>
        <MaterialCommunityIcons name="map-marker-outline" size={18} color={appColors.primary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={appColors.textMuted}
          value={query}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setIsOpen(false), BLUR_CLOSE_DELAY_MS)}
        />
        {query ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={16} color={appColors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {isOpen && (isLoading || results.length > 0) && (
        <View style={styles.dropdown}>
          {isLoading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="small" color={appColors.primary} />
            </View>
          ) : (
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 180 }}
              showsVerticalScrollIndicator={true}
            >
              {results.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.row}
                  onPress={() => handleSelect(item)}
                >
                  <MaterialCommunityIcons name="map-marker" size={16} color={appColors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.rowText}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  label: {
    color: appColors.text,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: appColors.text,
    padding: 0,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    backgroundColor: appColors.white,
    overflow: "hidden",
    marginTop: 4,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 999,
  },
  loadingWrapper: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  rowText: {
    fontSize: 13,
    color: appColors.text,
    fontWeight: "500",
  },
});
