import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { deleteMyPrinterProfile, getMyPrinterProfile, saveMyPrinterProfile } from "../data/printingApi";

export default function PrinterRegisterScreen() {
  const insets = useSafeAreaInsets();
  const [isPrinter, setIsPrinter] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [supportsColor, setSupportsColor] = useState(false);
  const [supportsDoubleSided, setSupportsDoubleSided] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  useFocusEffect(
    useCallback(() => {
      getMyPrinterProfile()
        .then((profile) => {
          setIsPrinter(!!profile);
          setIsLoaded(true);
          if (profile) {
            setLocationNote(profile.location_note);
            setSupportsColor(profile.supports_color);
            setSupportsDoubleSided(profile.supports_double_sided);
          }
        })
        .catch(() => setError("Couldn't load your printer settings."));
    }, []),
  );

  const handleSave = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await saveMyPrinterProfile({
        location_note: locationNote.trim(),
        supports_color: supportsColor,
        supports_double_sided: supportsDoubleSided,
      });
      router.replace("/(app)/printing");
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" ") : "Couldn't save your printer settings.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleStop = async () => {
    setError(null);
    setIsBusy(true);
    try {
      await deleteMyPrinterProfile();
      router.replace("/(app)/printing");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't stop being a printer. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  if (!isLoaded && !error) {
    return <View style={styles.rootContainer}>
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/printing")} accessibilityLabel="Go back"><MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} /></Pressable>
        <Text style={styles.topNavTitle}>Printer Setup</Text><View style={{ width: 36 }} />
      </View>
      <LoadingSkeleton variant="form" />
    </View>;
  }

  return (
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/printing")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>
          {!isLoaded ? "Printer Setup" : isPrinter ? "Printer Settings" : "Register as Printer"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        {/* Info Banner */}
        <View style={styles.bannerBox}>
          <View style={styles.bannerIconCircle}>
            <MaterialCommunityIcons name="printer-check" size={24} color={appColors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.bannerTitle}>Earn by Printing on Campus</Text>
            <Text style={styles.bannerSub}>
              Students will see your name, department, location, and supported printing features.
            </Text>
          </View>
        </View>

        {/* Location note */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Handover Location / Room (e.g. CS Dept Floor 2)"
              placeholderTextColor={appColors.textMuted}
              value={locationNote}
              onChangeText={setLocationNote}
            />
          </View>

          {/* Feature toggles */}
          <View style={styles.switchGroup}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.switchLabel}>Colour Printing</Text>
                <Text style={styles.switchSub}>Turn on if your printer can print in colour.</Text>
              </View>
              <Switch
                value={supportsColor}
                onValueChange={setSupportsColor}
                trackColor={{ true: appColors.primary, false: appColors.border }}
                thumbColor={appColors.white}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.switchLabel}>Double-Sided Printing</Text>
                <Text style={styles.switchSub}>Turn on if your printer can duplex print.</Text>
              </View>
              <Switch
                value={supportsDoubleSided}
                onValueChange={setSupportsDoubleSided}
                trackColor={{ true: appColors.primary, false: appColors.border }}
                thumbColor={appColors.white}
              />
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryBtn, isBusy && styles.primaryBtnDisabled]}
            onPress={handleSave}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color={appColors.black} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isPrinter ? "Save Changes" : "Register as Campus Printer"}
              </Text>
            )}
          </Pressable>

          {isPrinter && (
            <Pressable
              style={styles.stopBtn}
              onPress={handleStop}
              disabled={isBusy}
            >
              <MaterialCommunityIcons name="printer-off" size={16} color={appColors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.stopBtnText}>Deactivate Printer Profile</Text>
            </Pressable>
          )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  topNavBar: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    backgroundColor: appColors.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 8 + headerGrow,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: appColors.headerBg,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appColors.headerControlBg,
    borderWidth: 1,
    borderColor: appColors.headerControlBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.onHeader,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  bannerBox: {
    backgroundColor: appColors.surfaceMuted,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 12,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: appColors.primaryA08,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: appColors.primary,
  },
  bannerSub: {
    fontSize: 12,
    color: appColors.primary,
    lineHeight: 17,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  input: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    fontSize: 14,
    color: appColors.text,
  },
  switchGroup: {
    backgroundColor: appColors.surfaceMuted,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  switchSub: {
    fontSize: 11,
    color: appColors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: appColors.border,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.dangerBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
  },
  errorText: {
    color: appColors.red700,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: appColors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: appColors.black,
    fontWeight: "800",
    fontSize: 15,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appColors.red50,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
    marginTop: 8,
  },
  stopBtnText: {
    color: appColors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
});
