import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Button, Card, colors, font, radius, spacing, typography } from "../../../core/ui";
import { getFareQuote, listPlaces, requestRide, type FareQuote, type LatLng, type Place } from "../data/ondemandApi";
import { RideMap } from "./RideMap";

type Slot = "pickup" | "drop";
export interface Stop extends LatLng {
  label: string;
}

const SUGGESTION_LIMIT = 5;
export const PIN_LABEL = "Pinned on map";

interface LocationFieldProps {
  slot: Slot;
  title: string;
  placeholder: string;
  text: string;
  isChosen: boolean;
  isPinning: boolean;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onTogglePin: () => void;
  inputRef: React.RefObject<TextInput | null>;
}

// One start/end field: a marker on the left, the text box, and a map-pin button on the right.
function LocationField({ slot, title, placeholder, text, isChosen, isPinning, onChangeText, onFocus, onTogglePin, inputRef }: LocationFieldProps) {
  return (
    <View style={[styles.field, isPinning && styles.fieldPinning]}>
      <MaterialCommunityIcons
        name={slot === "pickup" ? "circle-slice-8" : "map-marker"}
        size={22}
        color={slot === "pickup" ? colors.success : colors.danger}
      />
      <View style={styles.flex1}>
        <Text style={styles.fieldTitle}>{title}</Text>
        <TextInput
          ref={inputRef}
          style={[styles.input, isChosen && styles.inputChosen]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={onChangeText}
          onFocus={onFocus}
          returnKeyType="search"
        />
      </View>
      <Pressable
        onPress={onTogglePin}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Choose ${title.toLowerCase()} on the map`}
        style={[styles.pinButton, isPinning && styles.pinButtonActive]}
      >
        <MaterialCommunityIcons name="map-marker-radius" size={22} color={isPinning ? colors.surface : colors.primary} />
      </Pressable>
    </View>
  );
}

// The pickup / drop-off fields, map and fuel share - shown straight on the On-demand home for riders.
export function RideBookingSection({ onRouteChange }: { onRouteChange?: (pickup: Stop | null, drop: Stop | null) => void }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [pickup, setPickup] = useState<Stop | null>(null);
  const [drop, setDrop] = useState<Stop | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [dropText, setDropText] = useState("");
  // Which field the suggestion list belongs to (the one being typed in).
  const [focusedSlot, setFocusedSlot] = useState<Slot | null>(null);
  // Which field is waiting for a tap on the map (null = map taps are ignored).
  const [pinSlot, setPinSlot] = useState<Slot | null>(null);
  const [quote, setQuote] = useState<FareQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickupInput = useRef<TextInput>(null);
  const dropInput = useRef<TextInput>(null);

  useEffect(() => {
    listPlaces().then(setPlaces).catch(() => setError("Couldn't load places. Check your connection."));
  }, []);

  // Lets the screen around this form (e.g. the Rides hub) react to the chosen points.
  useEffect(() => {
    onRouteChange?.(pickup, drop);
  }, [pickup, drop, onRouteChange]);

  // Fare is worked out automatically as soon as both points are set (or either changes).
  useEffect(() => {
    setQuote(null);
    if (!pickup || !drop) return;
    let isCurrent = true;
    setIsQuoting(true);
    setError(null);
    getFareQuote(pickup, drop)
      .then((result) => isCurrent && setQuote(result))
      .catch(() => isCurrent && setError("Couldn't work out the fare. Try again."))
      .finally(() => isCurrent && setIsQuoting(false));
    return () => {
      isCurrent = false;
    };
  }, [pickup, drop]);

  const suggestions = useMemo(() => {
    if (!focusedSlot) return [];
    const query = (focusedSlot === "pickup" ? pickupText : dropText).trim().toLowerCase();
    const alreadyChosen = (focusedSlot === "pickup" ? pickup : drop)?.label.toLowerCase() === query;
    if (alreadyChosen) return [];
    const matches = query ? places.filter((place) => place.name.toLowerCase().includes(query)) : places;
    return matches.slice(0, SUGGESTION_LIMIT);
  }, [focusedSlot, pickupText, dropText, pickup, drop, places]);

  const setStop = (slot: Slot, stop: Stop) => {
    if (slot === "pickup") {
      setPickup(stop);
      setPickupText(stop.label);
    } else {
      setDrop(stop);
      setDropText(stop.label);
    }
  };

  const handleTextChange = (slot: Slot, text: string) => {
    // Typing again means the earlier choice no longer matches the box, so forget it.
    if (slot === "pickup") {
      setPickupText(text);
      setPickup(null);
    } else {
      setDropText(text);
      setDrop(null);
    }
  };

  const pickSuggestion = (place: Place) => {
    if (!focusedSlot) return;
    setStop(focusedSlot, { lat: place.lat, lng: place.lng, label: place.name });
    // Chosen a pickup and no drop-off yet: jump to the next box.
    if (focusedSlot === "pickup" && !drop) dropInput.current?.focus();
    else {
      setFocusedSlot(null);
      (focusedSlot === "pickup" ? pickupInput : dropInput).current?.blur();
    }
  };

  const togglePin = (slot: Slot) => {
    setFocusedSlot(null);
    pickupInput.current?.blur();
    dropInput.current?.blur();
    setPinSlot((current) => (current === slot ? null : slot));
  };

  const handleMapTap = (point: LatLng) => {
    if (!pinSlot) return;
    setStop(pinSlot, { ...point, label: PIN_LABEL });
    setPinSlot(null);
  };

  const confirmRide = async () => {
    if (!pickup || !drop) return;
    setError(null);
    setIsRequesting(true);
    try {
      await requestRide({
        pickup_label: pickup.label,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        drop_label: drop.label,
        drop_lat: drop.lat,
        drop_lng: drop.lng,
      });
      router.replace("/(app)/ondemand/ride");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't request the ride. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <>
      <Card contentStyle={styles.fieldsCard}>
        <LocationField
          slot="pickup"
          title="Pickup"
          placeholder="Where from? Type a place"
          text={pickupText}
          isChosen={!!pickup}
          isPinning={pinSlot === "pickup"}
          onChangeText={(text) => handleTextChange("pickup", text)}
          onFocus={() => {
            setFocusedSlot("pickup");
            setPinSlot(null);
          }}
          onTogglePin={() => togglePin("pickup")}
          inputRef={pickupInput}
        />
        <View style={styles.divider} />
        <LocationField
          slot="drop"
          title="Drop-off"
          placeholder="Where to? Type a place"
          text={dropText}
          isChosen={!!drop}
          isPinning={pinSlot === "drop"}
          onChangeText={(text) => handleTextChange("drop", text)}
          onFocus={() => {
            setFocusedSlot("drop");
            setPinSlot(null);
          }}
          onTogglePin={() => togglePin("drop")}
          inputRef={dropInput}
        />
      </Card>

      {suggestions.length > 0 && (
        <Card contentStyle={styles.suggestions}>
          {suggestions.map((place) => (
            <Pressable key={place.id} onPress={() => pickSuggestion(place)} style={styles.suggestionRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.textMuted} />
              <Text style={styles.suggestionText} numberOfLines={1}>{place.name}</Text>
            </Pressable>
          ))}
        </Card>
      )}

      {pinSlot && (
        <View style={styles.pinBanner}>
          <MaterialCommunityIcons name="gesture-tap" size={20} color={colors.primary} />
          <Text style={styles.pinBannerText}>Tap the map to set your {pinSlot === "pickup" ? "pickup" : "drop-off"} point</Text>
          <Pressable onPress={() => setPinSlot(null)} hitSlop={8}>
            <Text style={styles.pinBannerCancel}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* The map only opens while choosing a point with a pin button, and closes once a point is picked. */}
      {pinSlot && <RideMap pickup={pickup} drop={drop} route={quote?.route} onTap={handleMapTap} />}

      {error && <Text style={styles.error}>{error}</Text>}

      {isQuoting && <ActivityIndicator color={colors.primary} />}

      {quote && (
        <Card contentStyle={styles.fareCard}>
          <Text style={styles.fareLabel}>Fuel share</Text>
          <Text style={styles.fareAmount}>Rs {quote.fare}</Text>
          <Text style={styles.fareDetail}>
            {quote.distance_km} km {quote.distance_source === "road" ? "by road" : "(straight line - road route unavailable)"} · Rs {Number(quote.rate_per_km)} per km
          </Text>
          <Text style={styles.fareDetail}>Paid to the driver directly, outside the app.</Text>
          <Button label="Confirm ride" onPress={confirmRide} loading={isRequesting} />
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fieldsCard: { gap: spacing.sm },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  fieldPinning: { backgroundColor: colors.surfaceMuted },
  fieldTitle: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.textMuted },
  input: { fontSize: typography.size.base, fontFamily: font.familyRegular, color: colors.ink, paddingVertical: spacing.xs },
  inputChosen: { fontFamily: font.familyMedium },
  divider: { height: 1, backgroundColor: colors.surfaceContainerHigh },
  pinButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  pinButtonActive: { backgroundColor: colors.primary },
  suggestions: { gap: 0, paddingVertical: spacing.xs },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  suggestionText: { flex: 1, fontSize: typography.size.base, fontFamily: font.familyRegular, color: colors.ink },
  pinBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  pinBannerText: { flex: 1, fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.ink },
  pinBannerCancel: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.primary },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  fareCard: { gap: spacing.xs },
  fareLabel: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.textMuted },
  fareAmount: { fontSize: 32, fontFamily: font.serif, color: colors.ink },
  fareDetail: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
});
