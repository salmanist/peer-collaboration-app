import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "./theme";

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
}

// One pulsing gray block - the building unit for skeleton loading screens.
// Screens compose several of these into a placeholder shaped like their real
// card, so the layout looks familiar before data ever lands instead of an
// empty gap or a spinner unrelated to what's about to appear.
export function Skeleton({ style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, style, { opacity }]} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.sm },
});
