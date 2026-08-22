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
    <SoftBlock backgroundColor={backgroundColor} flat={flat} style={style}>
      <View style={[styles.padding, contentStyle]}>{children}</View>
    </SoftBlock>
  );
}

const styles = StyleSheet.create({
  padding: { padding: spacing.lg, gap: spacing.sm },
});
