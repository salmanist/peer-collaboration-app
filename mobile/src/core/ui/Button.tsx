import { Text } from "./AppText";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { SoftBlock } from "./SoftBlock";
import { colors, font, spacing, typography } from "./theme";

type Variant = "primary" | "secondary" | "ink" | "danger" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const fillFor: Record<Variant, string> = {
  primary: colors.secondaryContainer,
  secondary: colors.secondary,
  ink: colors.secondaryContainer,
  danger: colors.danger,
  ghost: colors.surface,
};

const textFor: Record<Variant, string> = {
  primary: colors.onSecondaryContainer,
  secondary: colors.onSecondary,
  ink: colors.onSecondaryContainer,
  danger: colors.onDanger,
  ghost: colors.ink,
};

export function Button({ label, onPress, variant = "primary", loading, disabled, style }: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[style, isDisabled && styles.disabled]}
    >
      <SoftBlock backgroundColor={fillFor[variant]} borderColor={fillFor[variant]} pressed={isPressed && !isDisabled}>
        <Content loading={loading} color={textFor[variant]} label={label} />
      </SoftBlock>
    </Pressable>
  );
}

function Content({ loading, color, label }: { loading?: boolean; color: string; label: string }) {
  return (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.label, { color }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  content: { height: 54, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  label: { fontSize: typography.size.base, fontFamily: font.familyMedium },
});
