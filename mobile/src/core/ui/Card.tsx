import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { SoftBlock } from "./SoftBlock";
import { colors, spacing } from "./theme";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  flat?: boolean;
  backgroundColor?: string;
}

export function Card({ children, style, contentStyle, flat, backgroundColor = colors.surface }: CardProps) {
  return (
    // Shadow only, no border - this design system separates surfaces with the
    // ambient shadow (see theme.ts), not a hairline outline. SoftBlock's own
    // default border is still used elsewhere (icon chips, BackButton).
    <SoftBlock backgroundColor={backgroundColor} borderColor="transparent" flat={flat} style={style}>
      <View style={[styles.padding, contentStyle]}>{children}</View>
    </SoftBlock>
  );
}

const styles = StyleSheet.create({
  padding: { padding: spacing.lg, gap: spacing.sm },
});
