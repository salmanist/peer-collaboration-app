import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { SoftBlock } from "./SoftBlock";
import { colors, font, spacing, typography } from "./theme";

type Tone = "neutral" | "primary" | "secondary" | "success" | "warning" | "danger" | "tertiary";

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceContainerHigh, fg: colors.textSecondary },
  primary: { bg: colors.primaryFixed, fg: colors.onPrimaryFixed },
  secondary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
  success: { bg: colors.successBg, fg: colors.success },
  warning: { bg: colors.warningBg, fg: colors.warning },
  danger: { bg: colors.danger, fg: colors.onDanger },
  tertiary: { bg: colors.tertiary, fg: colors.onTertiary },
};

export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const palette = toneColors[tone];
  return (
    <SoftBlock backgroundColor={palette.bg} flat pill>
      <View style={styles.content}>
        {icon && <MaterialCommunityIcons name={icon} size={14} color={palette.fg} />}
        <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
      </View>
    </SoftBlock>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
  },
  label: {
    fontSize: typography.size.xs,
    fontFamily: font.familyMedium,
  },
});
