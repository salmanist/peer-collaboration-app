import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSegments } from "expo-router";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { BackButton } from "./BackButton";
import { useNavClearance } from "./BottomNavBar";
import { TopBar, TOP_BAR_HEIGHT } from "./TopBar";
import { colors, spacing } from "./theme";

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  center?: boolean;
  // true: back button with no fallback (errors quietly if there's no history).
  // string: back button that falls back to this route when there's nothing to pop to.
  back?: boolean | string;
  style?: StyleProp<ViewStyle>;
  // Which safe-area edges to inset.
  edges?: Edge[];
  // Renders the shared TopBar absolutely positioned over the content (a
  // fixed/floating header — content scrolls underneath it, not with it).
  // Pass true for no highlighted menu item, or an active-item key.
  topBar?: boolean | React.ComponentProps<typeof TopBar>["active"];
}

// Replaces the hardcoded `paddingTop: 64` every screen used to duplicate —
// SafeAreaView adapts to the real notch/status-bar height per device.
// `back` renders a BackButton in its own row above the content, outside the
// scroll/center flow — so it stays pinned top-left regardless of a screen's
// own layout (a `center` screen's content group would otherwise swallow it).
export function ScreenContainer({ children, scroll, center, back, style, edges, topBar }: ScreenContainerProps) {
  // Inside (app) the floating tab bar owns the bottom safe area, not the screen.
  const inApp = useSegments()[0] === "(app)";
  const navClearance = useNavClearance();
  const safeEdges: Edge[] = edges ?? (inApp ? ["top"] : ["top", "bottom"]);
  const Wrapper = scroll ? ScrollView : View;
  // ScrollView content scrolls under the floating tab bar, so it ends with enough
  // padding to clear it (FlatList screens add the same room via a NavClearance footer).
  const topPad = topBar ? { paddingTop: TOP_BAR_HEIGHT } : null;
  const scrollPad = inApp && scroll ? { paddingBottom: navClearance } : null;
  const wrapperProps = scroll
    ? { contentContainerStyle: [styles.content, topPad, scrollPad, center && styles.center, style], style: styles.flexFill, keyboardShouldPersistTaps: "handled" as const }
    : { style: [styles.content, styles.flexFill, topPad, center && styles.center, style] };

  return (
    <SafeAreaView style={styles.safeArea} edges={safeEdges}>
      {back && (
        <View style={styles.backRow}>
          <BackButton fallbackHref={typeof back === "string" ? back : undefined} />
        </View>
      )}
      <KeyboardAvoidingView style={styles.flexFill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Wrapper {...wrapperProps}>{children}</Wrapper>
      </KeyboardAvoidingView>
      {topBar && (
        <View style={styles.topBarOverlay}>
          <TopBar active={typeof topBar === "string" ? topBar : undefined} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flexFill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  center: { flexGrow: 1, justifyContent: "center" },
  backRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  topBarOverlay: { position: "absolute", top: 0, left: 0, right: 0 },
});
