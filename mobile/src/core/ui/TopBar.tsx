import { Text } from "./AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCampusNotificationStore } from "../../features/notifications/useCampusNotificationStore";
import { FelloLogo } from "../components/FelloLogo";
import { HamburgerMenu } from "./HamburgerMenu";
import { colors, font, spacing, typography } from "./theme";

// Reserved top inset for screens that float a TopBar over their content —
// matches the bar's own height exactly, no gap before content.
export const TOP_BAR_HEIGHT = 44;
const BAR_HEIGHT = 44;

interface TopBarProps {
  active?: React.ComponentProps<typeof HamburgerMenu>["active"];
}

// The one consistent header every (app) screen renders: hamburger menu on
// the left, the "Fello" wordmark with the signature yellow mark centered, a profile shortcut on the right.
export function TopBar({ active }: TopBarProps) {
  const topInset = useSafeAreaInsets().top;
  const unseenCount = useCampusNotificationStore((state) => state.unseenCount);
  const openCenter = useCampusNotificationStore((state) => state.openCenter);
  return (
    <View style={[styles.bar, { height: BAR_HEIGHT + topInset, paddingTop: topInset }]}>
      <View style={[styles.side, styles.sideLeft]}>
        <HamburgerMenu active={active} tint={colors.onHeader} />
      </View>
      <View style={styles.brandRow}>
        <FelloLogo size={22} variant="yellow" />
        <Text style={styles.title}>Fello</Text>
      </View>
      <View style={[styles.side, styles.sideRight]}>
        <Pressable onPress={openCenter} hitSlop={8}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={colors.onHeader} />
          {unseenCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unseenCount > 9 ? "9+" : unseenCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => router.push("/(app)/profile")} hitSlop={8}>
          <MaterialCommunityIcons name="account-outline" size={26} color={colors.onHeader} />
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
    backgroundColor: colors.headerBg,
    paddingHorizontal: spacing.md,
  },
  side: { width: 64, alignItems: "center" },
  sideLeft: { alignItems: "flex-start" },
  sideRight: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
  title: { fontSize: 22, fontFamily: font.family, color: colors.onHeader },
});
