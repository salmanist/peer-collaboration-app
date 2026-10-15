import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { SoftBlock } from "./SoftBlock";
import { colors, font, spacing, typography } from "./theme";

interface EmptyStateProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <SoftBlock backgroundColor={colors.surfaceMuted} pill flat size={76} style={styles.iconBlock}>
        <MaterialCommunityIcons name={icon} size={32} color={colors.textMuted} />
      </SoftBlock>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  iconBlock: { marginBottom: spacing.xs },
  title: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  subtitle: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, textAlign: "center" },
});
