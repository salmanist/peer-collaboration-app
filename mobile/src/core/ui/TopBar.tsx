import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
// a flat, full-width white bar (no card/shadow) that blends into whatever
// sits behind it (off-white canvas or a colored hero banner).
export function TopBar({ active }: TopBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        <HamburgerMenu active={active} />
      </View>
      <Text style={styles.title}>Fello</Text>
      <View style={styles.side}>
        <Pressable onPress={() => router.push("/(app)/profile")} hitSlop={8}>
          <MaterialCommunityIcons name="account-circle-outline" size={26} color={colors.ink} />
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  side: { width: 40, alignItems: "center" },
  title: { fontSize: typography.size.base, fontFamily: font.family, color: colors.ink },
});
