import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BAR_KEYS, NAV_ITEMS } from "./HamburgerMenu";
import { colors, spacing } from "./theme";

const BAR_HEIGHT = 60;
const BAR_GAP = 12; // space between the floating bar and the bottom safe-area edge
const SIDE_MARGIN = spacing.md;

// How much bottom room a screen needs so its last item can scroll clear of the
// floating bar (content scrolls underneath it, so nothing reserves space itself).
export function useNavClearance() {
  const { bottom } = useSafeAreaInsets();
  return BAR_HEIGHT + BAR_GAP + bottom + spacing.md;
}

// Spacer for FlatList/SectionList footers.
export function NavClearance() {
  return <View style={{ height: useNavClearance() }} />;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

// Floating glass tab bar, WhatsApp/Instagram style. Lives in the (app) layout
// so it persists across every signed-in screen; the active tab comes from the
// URL ("/(app)/rides/12" -> segments[1] === "rides"), so sub-screens keep it lit.
export function BottomNavBar() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardOpen) return null;

  const handlePress = (href: string, focused: boolean) => {
    // Tapping the open tab goes back to its top screen; switching tabs swaps the
    // section in place so the back stack doesn't pile up with old tab hops.
    if (focused) {
      router.dismissTo(href);
      return;
    }
    if (router.canDismiss()) router.dismissAll();
    router.replace(href);
  };

  return (
    // Outer view carries the shadow (overflow:hidden on the glass would clip it).
    <View style={[styles.shadow, { bottom: insets.bottom + BAR_GAP }]} pointerEvents="box-none">
      <View style={styles.glass}>
        <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        {/* Milky wash on top of the blur so the bar stays readable over busy content. */}
        <View style={[StyleSheet.absoluteFill, styles.wash]} />
        {NAV_ITEMS.filter((item) => (BAR_KEYS as readonly string[]).includes(item.key)).map((item) => {
          const currentSection = (segments as string[])[1];
          // On-demand ride screens live under their own route folder but belong to the Rides tab.
          const focused = item.href.split("/")[2] === currentSection || (item.key === "rides" && currentSection === "ondemand");
          // Filled icon for the active tab = the same glyph without its "-outline" suffix.
          const icon = (focused ? item.icon.replace("-outline", "") : item.icon) as IconName;
          return (
            <Pressable
              key={item.key}
              style={styles.item}
              onPress={() => handlePress(item.href, focused)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: focused }}
            >
              <MaterialCommunityIcons name={icon} size={26} color={focused ? colors.primaryContainer : colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: "absolute",
    left: SIDE_MARGIN,
    right: SIDE_MARGIN,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    shadowColor: colors.black,
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  glass: {
    flex: 1,
    flexDirection: "row",
    borderRadius: BAR_HEIGHT / 2,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.whiteA70,
  },
  wash: { backgroundColor: colors.whiteA20 },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
});
