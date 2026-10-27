import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text, TextInput } from "../../../core/ui/AppText";
import { colors as appColors } from "../../../core/ui/theme";
// ponytail: borrows the ondemand map instead of moving it to core; move it there if a third feature needs it.
import { RideMap } from "../../ondemand/presentation/RideMap";
import type { LatLng } from "../../ondemand/data/ondemandApi";

export const PIN_LABEL = "Pinned on map";

interface PinPickerModalProps {
  visible: boolean;
  // Dropdown area the pin refines; the map opens here. Null when the student pins from scratch.
  areaName?: string | null;
  center?: LatLng | null;
  initialPin?: LatLng | null;
  onCancel: () => void;
  onConfirm: (pin: LatLng, label: string) => void;
}

export function PinPickerModal({ visible, areaName, center, initialPin, onCancel, onConfirm }: PinPickerModalProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [pin, setPin] = useState<LatLng | null>(initialPin ?? null);
  const [label, setLabel] = useState(areaName ?? PIN_LABEL);

  // Start fresh every time the picker opens.
  useEffect(() => {
    if (!visible) return;
    setPin(initialPin ?? null);
    setLabel(areaName ?? PIN_LABEL);
  }, [visible, areaName, initialPin]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10} accessibilityLabel="Close map">
            <MaterialCommunityIcons name="close" size={24} color={appColors.text} />
          </Pressable>
          <Text style={styles.title}>{areaName ? `Pin exact spot in ${areaName}` : "Drop a pin"}</Text>
        </View>

        <Text style={styles.hint}>Tap the map to place the pin. Tap again to move it.</Text>
        <RideMap pickup={pin} drop={null} center={center} onTap={setPin} height={Math.max(260, height - 320)} />

        {/* The label only matters when there is no dropdown area to name the pin after. */}
        {!areaName && (
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Name this spot (e.g. My street)"
            placeholderTextColor={appColors.textMuted}
            maxLength={100}
          />
        )}

        <Pressable
          style={[styles.confirm, !pin && styles.confirmDisabled]}
          disabled={!pin}
          onPress={() => pin && onConfirm(pin, label.trim() || PIN_LABEL)}
        >
          <MaterialCommunityIcons name="map-marker-check" size={20} color={appColors.text} />
          <Text style={styles.confirmText}>Use this pin</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: appColors.surfaceMuted, paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: appColors.primary },
  hint: { fontSize: 13, fontWeight: "500", color: appColors.textMuted },
  input: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: appColors.text,
  },
  confirm: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: appColors.gold,
    borderRadius: 14,
    paddingVertical: 14,
  },
  confirmDisabled: { opacity: 0.45 },
  confirmText: { fontSize: 15, fontWeight: "800", color: appColors.text },
});
