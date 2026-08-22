import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSessionStore } from "../auth/session";
import { colors, font, spacing, typography } from "./theme";

// Shared with BottomNavBar — the app's 3 top-level sections, one source of truth.
export const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "compass-outline", href: "/(app)/home" },
  { key: "rides", label: "Ride Sharing", icon: "car-outline", href: "/(app)/rides" },
  { key: "library", label: "Digital Library", icon: "book-open-variant-outline", href: "/(app)/library" },
] as const;
const ITEMS = NAV_ITEMS;

const PANEL_WIDTH = Math.min(Dimensions.get("window").width * 0.78, 320);
const SLIDE_MS = 220;

interface HamburgerMenuProps {
  active?: (typeof ITEMS)[number]["key"];
  // Tints the trigger icon for use on a dark hero banner.
  tint?: string;
}

// The app's only persistent navigation surface — there's no bottom tab bar
// or drawer navigator, just this button + a lightweight modal panel every
// top-level screen renders in its header.
export function HamburgerMenu({ active, tint }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    if (open) {
      translateX.setValue(-PANEL_WIDTH);
      Animated.timing(translateX, { toValue: 0, duration: SLIDE_MS, useNativeDriver: true }).start();
    }
  }, [open]);

  // Slides the panel back off-screen before actually unmounting the modal,
  // so closing reads as motion instead of a hard cut.
  const close = (after?: () => void) => {
    Animated.timing(translateX, { toValue: -PANEL_WIDTH, duration: SLIDE_MS, useNativeDriver: true }).start(() => {
      setOpen(false);
      after?.();
    });
  };

  const go = (href: string) => close(() => router.push(href));

  const logout = () => close(async () => {
    await clearSession();
    router.replace("/(auth)/login");
  });

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        <MaterialCommunityIcons name="menu" size={24} color={tint ?? colors.ink} />
      </Pressable>

      <Modal visible={open} animationType="none" transparent onRequestClose={() => close()}>
        <Pressable style={styles.backdrop} onPress={() => close()} />
        <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
          <SafeAreaView style={styles.panelInner} edges={["top", "bottom"]}>
            <Text style={styles.panelTitle}>Menu</Text>
            {ITEMS.map((item) => {
              const focused = item.key === active;
              return (
                <Pressable key={item.key} style={[styles.row, focused && styles.rowActive]} onPress={() => go(item.href)}>
                  <MaterialCommunityIcons name={item.icon} size={22} color={focused ? colors.primaryContainer : colors.ink} />
                  <Text style={[styles.label, focused && styles.labelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
            <View style={styles.divider} />
            <Pressable style={styles.row} onPress={logout}>
              <MaterialCommunityIcons name="logout" size={22} color={colors.danger} />
              <Text style={[styles.label, { color: colors.danger }]}>Log out</Text>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_WIDTH,
    backgroundColor: colors.surface,
  },
  panelInner: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  panelTitle: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.textMuted, marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: 12 },
  rowActive: { backgroundColor: colors.primaryFixed },
  label: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  labelActive: { color: colors.primaryContainer },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
