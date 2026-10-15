import { StyleSheet, View } from "react-native";

import { colors } from "./theme";

// Pulling a screen down on iOS slides the content away from the top and would show the white page
// background above the green hero. Put this as the first child of a hero banner: it paints a tall
// strip of the same green above it, so the "bounce" area stays green.
export function OverscrollFill() {
  return <View pointerEvents="none" style={styles.fill} />;
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: -1000, left: 0, right: 0, height: 1000, backgroundColor: colors.primaryContainer },
});
