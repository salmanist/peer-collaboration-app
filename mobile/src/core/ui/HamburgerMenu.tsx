import { Text } from "./AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, StyleSheet} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSessionStore } from "../auth/session";
import { colors, font, spacing, typography } from "./theme";

// Shared with BottomNavBar — the app's top-level sections, one source of truth.
export const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "compass-outline", href: "/(app)/home" },
  { key: "rides", label: "Rides", icon: "car-outline", href: "/(app)/rides" },
  { key: "library", label: "Digital Library", icon: "book-open-variant-outline", href: "/(app)/library" },
  { key: "resources", label: "Marketplace", icon: "storefront-outline", href: "/(app)/resources" },
  { key: "tutoring", label: "Peer Tutoring", icon: "school-outline", href: "/(app)/tutoring" },
  { key: "printing", label: "Print Centre", icon: "printer-outline", href: "/(app)/printing" },
  { key: "lost-and-found", label: "Lost & Found", icon: "magnify", href: "/(app)/lost-and-found" },
] as const;
// Floating bottom bar only has room for five; the rest live in the hamburger menu.
export const BAR_KEYS = ["home", "rides", "library", "resources", "tutoring"] as const;
const ADMIN_ITEM = { key: "admin", label: "Admin Center", icon: "shield-account-outline", href: "/(app)/admin" } as const;
const ITEMS = NAV_ITEMS;

const PANEL_WIDTH = Math.min(Dimensions.get("window").width * 0.78, 320);
const SLIDE_MS = 220;

interface HamburgerMenuProps {
  active?: (typeof ITEMS)[number]["key"] | "admin";
  // Tints the trigger icon for use on a dark hero banner.
  tint?: string;
}

// The app's only persistent navigation surface — there's no bottom tab bar
// or drawer navigator, just this button + a lightweight modal panel every
// top-level screen renders in its header.
export function HamburgerMenu({ active, tint }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const isAdmin = useSessionStore((state) => state.user?.role === "admin");
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current;

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
            {[...ITEMS, ...(isAdmin ? [ADMIN_ITEM] : [])].map((item) => {
              const focused = item.key === active;
              return (
                <Pressable key={item.key} style={[styles.row, focused && styles.rowActive]} onPress={() => go(item.href)}>
                  <MaterialCommunityIcons name={item.icon} size={22} color={focused ? colors.primaryContainer : colors.ink} />
                  <Text style={[styles.label, focused && styles.labelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </SafeAreaView>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.blackA40 },
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
});
