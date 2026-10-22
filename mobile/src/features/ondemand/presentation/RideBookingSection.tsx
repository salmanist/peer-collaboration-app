import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";

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

function LocationField({
  slot,
  title,
  placeholder,
  text,
  isChosen,
  isPinning,
  onChangeText,
  onFocus,
  onTogglePin,
  inputRef,
}: LocationFieldProps) {
  return (
    <View style={[styles.field, isPinning && styles.fieldPinning]}>
      <View style={slot === "pickup" ? styles.pickupMarker : styles.dropoffMarker}>
        <MaterialCommunityIcons
          name={slot === "pickup" ? "circle-slice-8" : "map-marker"}
          size={16}
          color={slot === "pickup" ? appColors.icon : "#DC2626"}
        />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.fieldTitle}>{title}</Text>
        <TextInput
          nativeID={`ride-booking-${slot}`}
          accessibilityLabel={title}
          underlineColorAndroid="transparent"
          ref={inputRef}
          style={[styles.input, isChosen && styles.inputChosen]}
          placeholder={placeholder}
          placeholderTextColor={appColors.textMuted}
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
        <MaterialCommunityIcons
          name="map-marker-radius"
          size={18}
          color={isPinning ? "#FFFFFF" : appColors.primary}
        />
      </Pressable>
    </View>
  );
}

export function RideBookingSection({
  onRouteChange,
}: {
  onRouteChange?: (pickup: Stop | null, drop: Stop | null) => void;
}) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.textContent = `
      #ride-booking-pickup, #ride-booking-drop,
      #ride-booking-pickup:focus, #ride-booking-drop:focus,
      #ride-booking-pickup:focus-visible, #ride-booking-drop:focus-visible {
        outline: none !important;
        border: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  const [places, setPlaces] = useState<Place[]>([]);
  const [pickup, setPickup] = useState<Stop | null>(null);
  const [drop, setDrop] = useState<Stop | null>(null);
  const [pickupText, setPickupText] = useState("");
  const [dropText, setDropText] = useState("");
  const [focusedSlot, setFocusedSlot] = useState<Slot | null>(null);
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

  useEffect(() => {
    onRouteChange?.(pickup, drop);
  }, [pickup, drop, onRouteChange]);

  useEffect(() => {
    setQuote(null);
    if (!pickup || !drop) return;
    let isCurrent = true;
    setIsQuoting(true);
    setError(null);
    getFareQuote(pickup, drop)
      .then((q) => {
        if (isCurrent) setQuote(q);
      })
      .catch((err: any) => {
        if (isCurrent) setError(err?.response?.data?.detail ?? "Couldn't work out the fare. Try pinning the points.");
      })
      .finally(() => {
        if (isCurrent) setIsQuoting(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [pickup, drop]);

  const suggestions = useMemo(() => {
    if (!focusedSlot) return [];
    const query = (focusedSlot === "pickup" ? pickupText : dropText).trim().toLowerCase();
    if (!query || query === PIN_LABEL.toLowerCase()) return [];
    return places.filter((p) => p.name.toLowerCase().includes(query)).slice(0, SUGGESTION_LIMIT);
  }, [places, focusedSlot, pickupText, dropText]);

  const handleTextChange = (slot: Slot, text: string) => {
    if (slot === "pickup") {
      setPickupText(text);
      if (pickup && pickup.label !== text) setPickup(null);
    } else {
      setDropText(text);
      if (drop && drop.label !== text) setDrop(null);
    }
  };

  const pickSuggestion = (place: Place) => {
    const stop: Stop = { label: place.name, lat: place.lat, lng: place.lng };
    if (focusedSlot === "pickup") {
      setPickup(stop);
      setPickupText(place.name);
      setFocusedSlot(null);
      if (!drop) dropInput.current?.focus();
    } else {
      setDrop(stop);
      setDropText(place.name);
      setFocusedSlot(null);
    }
  };

  const togglePin = (slot: Slot) => {
    setFocusedSlot(null);
    setPinSlot((current) => (current === slot ? null : slot));
  };

  const handleMapTap = (point: LatLng) => {
    if (!pinSlot) return;
    const stop: Stop = { label: PIN_LABEL, lat: point.lat, lng: point.lng };
    if (pinSlot === "pickup") {
      setPickup(stop);
      setPickupText(PIN_LABEL);
    } else {
      setDrop(stop);
      setDropText(PIN_LABEL);
    }
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
    <View style={styles.container}>
      {/* Route Inputs Card */}
      <View style={styles.fieldsCard}>
        <LocationField
          slot="pickup"
          title="PICKUP LOCATION"
          placeholder="Where from? Type a place or pin on map"
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
          title="DROP-OFF DESTINATION"
          placeholder="Where to? Type a place or pin on map"
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
      </View>

      {/* Suggestions Card */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsCard}>
          {suggestions.map((place, idx) => (
            <Pressable
              key={place.id}
              onPress={() => pickSuggestion(place)}
              style={[styles.suggestionRow, idx < suggestions.length - 1 && styles.suggestionBorder]}
            >
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={appColors.primary} />
              <Text style={styles.suggestionText} numberOfLines={1}>
                {place.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Pin Instructions Banner */}
      {pinSlot && (
        <View style={styles.pinBanner}>
          <MaterialCommunityIcons name="gesture-tap" size={20} color={appColors.primary} />
          <Text style={styles.pinBannerText}>
            Tap on the map below to select your {pinSlot === "pickup" ? "pickup" : "drop-off"} location
          </Text>
          <Pressable onPress={() => setPinSlot(null)} hitSlop={8}>
            <Text style={styles.pinBannerCancel}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* Map Preview when Pinning */}
      {pinSlot && (
        <View style={styles.mapWrap}>
          <RideMap pickup={pickup} drop={drop} route={quote?.route} onTap={handleMapTap} />
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Quoting Indicator */}
      {isQuoting && (
        <View style={styles.quotingRow}>
          <ActivityIndicator color={appColors.primary} size="small" />
          <Text style={styles.quotingText}>Calculating best route and fuel share...</Text>
        </View>
      )}

      {/* Fare Quote Card */}
      {quote && (
        <View style={styles.fareCard}>
          <View style={styles.fareHeaderRow}>
            <View>
              <Text style={styles.fareLabel}>ESTIMATED FUEL SHARE</Text>
              <Text style={styles.fareAmount}>Rs {quote.fare}</Text>
            </View>
            <View style={styles.fuelIconCircle}>
              <MaterialCommunityIcons name="gas-station" size={24} color={appColors.primary} />
            </View>
          </View>

          <View style={styles.fareMetricsRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricPillText}>
                {quote.distance_km} km {quote.distance_source === "road" ? "by road" : "(estimated)"}
              </Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricPillText}>Rs {Number(quote.rate_per_km)} / km</Text>
            </View>
          </View>

          <Text style={styles.fareNote}>Paid directly to the driver upon completion.</Text>

          <Pressable
            style={[styles.primaryBtn, isRequesting && styles.btnDisabled]}
            onPress={confirmRide}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <ActivityIndicator color={appColors.primary} />
            ) : (
              <View style={styles.btnContentRow}>
                <MaterialCommunityIcons name="car-sports" size={20} color={appColors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Confirm & Request Ride</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  fieldsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  fieldPinning: {
    backgroundColor: appColors.surfaceMuted,
  },
  pickupMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: appColors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  dropoffMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  fieldTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: appColors.textMuted,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 0,
    backgroundColor: "transparent",
    ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
    fontSize: 14,
    color: appColors.text,
    paddingVertical: 2,
  },
  inputChosen: {
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: appColors.border,
    marginVertical: 4,
    marginLeft: 40,
  },
  pinButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
  },
  pinButtonActive: {
    backgroundColor: appColors.primary,
    borderColor: appColors.primary,
  },
  suggestionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: appColors.border,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: appColors.text,
  },
  pinBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  pinBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: appColors.primary,
  },
  pinBannerCancel: {
    fontSize: 12,
    fontWeight: "800",
    color: appColors.primary,
    textDecorationLine: "underline",
  },
  mapWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: appColors.border,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  quotingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  quotingText: {
    fontSize: 12,
    color: appColors.textSecondary,
    fontWeight: "600",
  },
  fareCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  fareHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: appColors.textSecondary,
    letterSpacing: 0.5,
  },
  fareAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: appColors.primary,
    marginTop: 2,
  },
  fuelIconCircle: {
    width: 44,
    height: 44,


    justifyContent: "center",
    alignItems: "center",
  },
  fareMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricPill: {
    backgroundColor: appColors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metricPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  fareNote: {
    fontSize: 12,
    color: appColors.textSecondary,
  },
  primaryBtn: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 3,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: appColors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
