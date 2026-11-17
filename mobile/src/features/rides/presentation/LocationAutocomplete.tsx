import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
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

import type { LatLng } from "../../ondemand/data/ondemandApi";
import { searchLocations, type RideLocation } from "../data/ridesApi";
import { PinPickerModal } from "./PinPickerModal";

const DEBOUNCE_MS = 250;
const MY_LOCATION_LABEL = "My current location";
// ponytail: a rectangle around Lahore (same box the server checks), not a real boundary.
const isInsideLahore = (lat: number, lng: number) => lat >= 31.2 && lat <= 31.8 && lng >= 73.9 && lng <= 74.7;
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
  // Shows a pin button so the student can refine the chosen area (or pick from scratch) on a map.
  enablePin?: boolean;
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
  enablePin,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(textValue ?? value?.name ?? "");
  const [results, setResults] = useState<RideLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only the newest suggestion request may show its results; the API can answer out of order when it is slow.
  const latestRequest = useRef(0);
  // The dropdown area last picked, and the exact pin dropped on top of it (if any).
  const [area, setArea] = useState<RideLocation | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const canPin = !!enablePin;
  const areaForPin = area ?? (value && value.id !== 0 ? value : null);

  useEffect(() => {
    if (textValue !== undefined) {
      setQuery(textValue);
    } else if (value !== undefined) {
      setQuery(value?.name ?? "");
    }
    // The parent cleared the field (e.g. form reset): forget the area and pin too.
    if (value === null) {
      setArea(null);
      setPin(null);
    }
  }, [textValue, value]);

  const fetchSuggestions = async (searchText: string) => {
    const requestId = ++latestRequest.current;
    setIsLoading(true);
    try {
      const data = await searchLocations(searchText);
      if (requestId === latestRequest.current) setResults(data);
    } catch {
      if (requestId === latestRequest.current) setResults([]);
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false);
    }
  };

  const handleChangeText = (text: string) => {
    setLocationError(null);
    setQuery(text);
    setArea(null);
    setPin(null);
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
    latestRequest.current++; // a request still in flight must not reopen old suggestions
    setArea(location);
    setPin(null);
    setQuery(location.name);
    onTextChange?.(location.name);
    onChange?.(location);
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setArea(null);
    setPin(null);
    setQuery("");
    onTextChange?.("");
    onChange?.(null);
    setResults([]);
  };

  // Asks the phone for permission (an explicit prompt), then reads the live position into the field.
  const handleUseMyLocation = async () => {
    setLocationError(null);
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError("Location permission was not allowed. Turn it on in your settings, or pick a place from the list or map.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = position.coords;
      if (!isInsideLahore(lat, lng)) {
        setLocationError("Your current location is outside Lahore. Pick a place from the list or map instead.");
        return;
      }
      latestRequest.current++;
      setArea(null);
      setPin({ lat, lng });
      setQuery(MY_LOCATION_LABEL);
      onTextChange?.(MY_LOCATION_LABEL);
      onChange?.({ id: 0, name: MY_LOCATION_LABEL, lat, lng });
      setResults([]);
      setIsOpen(false);
    } catch {
      setLocationError("Couldn't get your location. Check that location services are turned on and try again.");
    } finally {
      setIsLocating(false);
    }
  };

  const handlePinConfirm = (point: LatLng, label: string) => {
    // The area name stays; only the coordinates become exact. A pin with no area is named by the student.
    const name = areaForPin?.name ?? label;
    setPin(point);
    setQuery(name);
    onTextChange?.(name);
    onChange?.({ id: areaForPin?.id ?? 0, name, lat: point.lat, lng: point.lng });
    setIsPickerOpen(false);
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
        {canPin ? (
          <Pressable onPress={() => setIsPickerOpen(true)} hitSlop={8} accessibilityLabel="Pin exact location on map" style={styles.pinButton}>
            <MaterialCommunityIcons name={pin ? "map-marker-check" : "map-marker-radius"} size={20} color={appColors.primary} />
            {pin ? <Text style={styles.pinTag}>Pinned</Text> : null}
          </Pressable>
        ) : null}
        {query ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={16} color={appColors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {isOpen && (canPin || isLoading || results.length > 0) && (
        <View style={styles.dropdown}>
          {canPin && (
            <Pressable style={styles.row} onPress={handleUseMyLocation} disabled={isLocating} accessibilityRole="button">
              {isLocating ? (
                <ActivityIndicator size="small" color={appColors.primary} style={{ marginRight: 8 }} />
              ) : (
                <MaterialCommunityIcons name="crosshairs-gps" size={16} color={appColors.primary} style={{ marginRight: 8 }} />
              )}
              <Text style={[styles.rowText, { color: appColors.primary, fontWeight: "700" }]}>Use my current location</Text>
            </Pressable>
          )}
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

      {!!locationError && <Text style={styles.locationError}>{locationError}</Text>}

      {canPin && (
        <PinPickerModal
          visible={isPickerOpen}
          areaName={areaForPin?.name ?? null}
          center={pin ?? (areaForPin ? { lat: areaForPin.lat, lng: areaForPin.lng } : null)}
          initialPin={pin}
          onCancel={() => setIsPickerOpen(false)}
          onConfirm={handlePinConfirm}
        />
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
  locationError: { fontSize: 12, fontWeight: "500", color: appColors.danger, marginTop: 2 },
  pinButton: { flexDirection: "row", alignItems: "center", gap: 4, marginHorizontal: 8 },
  pinTag: { fontSize: 11, fontWeight: "700", color: appColors.primary },
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
