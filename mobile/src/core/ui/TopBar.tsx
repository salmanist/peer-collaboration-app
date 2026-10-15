import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCampusNotificationStore } from "../../features/notifications/useCampusNotificationStore";
import { HamburgerMenu } from "./HamburgerMenu";
import { colors, font, spacing, typography } from "./theme";

// Reserved top inset for screens that float a TopBar over their content —
// matches the bar's own height exactly, no gap before content.
export const TOP_BAR_HEIGHT = 70;
const BAR_HEIGHT = 70;

interface TopBarProps {
  active?: React.ComponentProps<typeof HamburgerMenu>["active"];
}

// The one consistent header every (app) screen renders: hamburger menu on
// the left, the "Fello" wordmark centered, a profile shortcut on the right —
// a flat, full-width bar (no card/shadow) in the same university-blue used
// for the ride sharing hero.
export function TopBar({ active }: TopBarProps) {
  // The bar is absolutely positioned at the very top of the screen, so it has to cover the
  // notch/status-bar area itself (ScreenContainer already pads its content by the same inset).
  const topInset = useSafeAreaInsets().top;
  const unseenCount = useCampusNotificationStore((state) => state.unseenCount);
  const openCenter = useCampusNotificationStore((state) => state.openCenter);
  return (
    <View style={[styles.bar, { height: BAR_HEIGHT + topInset, paddingTop: topInset }]}>
      <View style={[styles.side, styles.sideLeft]}>
        <HamburgerMenu active={active} tint={colors.surface} />
      </View>
      <Text style={styles.title}>FellOo</Text>
      <View style={[styles.side, styles.sideRight]}>
        <Pressable onPress={openCenter} hitSlop={8}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={colors.surface} />
          {unseenCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unseenCount > 9 ? "9+" : unseenCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => router.push("/(app)/profile")} hitSlop={8}>
          <MaterialCommunityIcons name="account-circle-outline" size={26} color={colors.surface} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.lg,
  },
  side: { width: 64, alignItems: "center" },
  // Flush with the paddingHorizontal edge, matching the "Ride Sharing"-style
  // heading's own left inset below it — not centered in the 64px box like
  // the default `side` (that box only exists to keep "Fello" truly centered
  // against the wider icon pair on the right).
  sideLeft: { alignItems: "flex-start" },
  sideRight: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
  },
  badgeText: { fontSize: 10, fontFamily: font.family, color: colors.surface },
  title: { fontSize: typography.size.base, fontFamily: font.family, color: colors.surface },
});
