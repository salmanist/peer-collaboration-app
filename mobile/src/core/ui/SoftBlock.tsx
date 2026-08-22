import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { border, colors, radius, shadow } from "./theme";

interface SoftBlockProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  pressed?: boolean;
  // No shadow and no border — for a block that already sits inside a card.
  flat?: boolean;
  pill?: boolean;
  // Fixed square size (avatar/icon chips). Without it, the block
  // shrink-wraps its content.
  size?: number;
}

// The Fello "soft card": white/tinted surface, hairline border, gentle drop
// shadow — a shadow wrapper around an overflow-hidden inner view (shadows and
// `overflow: hidden` fight on the same view in RN, hence the two layers).
export function SoftBlock({ children, style, backgroundColor = colors.surface, borderColor = colors.border, pressed, flat, pill, size }: SoftBlockProps) {
  const sizeStyle = size ? { width: size, height: size } : null;
  const radiusStyle = { borderRadius: pill ? radius.full : radius.md };
  // Icon/avatar chips (pill or a fixed size) center their content; a plain
  // block (e.g. Card) stretches full-width so its own content controls
  // alignment instead of shrink-wrapping and getting centered inside.
  const isChip = pill || size;

  return (
    <View style={[sizeStyle, !flat && styles.shadowWrap, radiusStyle, pressed && styles.pressed, style]}>
      <View style={[styles.inner, isChip && styles.chipInner, sizeStyle, radiusStyle, { backgroundColor, borderColor: flat ? "transparent" : borderColor }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: shadow.color,
    shadowOpacity: shadow.opacity,
    shadowRadius: shadow.radius,
    shadowOffset: { width: 0, height: shadow.offsetY },
    elevation: 3,
  },
  inner: { borderWidth: border.thin, overflow: "hidden" },
  chipInner: { alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.65 },
});
