import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { NAV_ITEMS } from "./HamburgerMenu";
import { colors, spacing } from "./theme";

// Reserved bottom inset for screens that fix this bar over their content.
export const BOTTOM_NAV_HEIGHT = 64;

interface BottomNavBarProps {
  active?: (typeof NAV_ITEMS)[number]["key"];
}

// A second, parallel way to jump between the app's top-level sections
// (alongside the existing hamburger menu) — a flat, full-width bar fixed
// to the bottom of the screen, no card/shadow.
export function BottomNavBar({ active }: BottomNavBarProps) {
  return (
    <View style={styles.bar}>
      {NAV_ITEMS.map((item) => {
        const focused = item.key === active;
        return (
          <Pressable key={item.key} style={styles.item} onPress={() => router.push(item.href)} hitSlop={8}>
            <MaterialCommunityIcons name={item.icon} size={24} color={focused ? colors.primaryContainer : colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_NAV_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.surface,
  },
  item: { padding: spacing.xs },
});
