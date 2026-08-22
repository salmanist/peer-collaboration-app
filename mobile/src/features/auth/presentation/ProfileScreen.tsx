import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import { Badge, Button, ScreenContainer, SoftBlock, colors, font, spacing, typography } from "../../../core/ui";

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function ProfileScreen() {
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clearSession);

  if (!user) return null;

  const handleLogout = async () => {
    await clearSession();
    router.replace("/(auth)/login");
  };

  return (
    <ScreenContainer scroll topBar>
      <View style={styles.header}>
        <SoftBlock backgroundColor={colors.primaryFixed} pill size={84} style={styles.avatarBlock}>
          <Text style={styles.avatarText}>{initials(user.full_name)}</Text>
        </SoftBlock>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badgeRow}>
          <Badge label={user.role} tone="primary" />
          {user.department && <Badge label={user.department} tone="tertiary" />}
          {!!user.enrollment_year && <Badge label={String(user.enrollment_year)} tone="success" />}
        </View>
      </View>

      <Button label="Log out" variant="ink" onPress={handleLogout} style={styles.logoutButton} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.lg },
  avatarBlock: { marginBottom: spacing.sm },
  avatarText: { width: 84, height: 84, textAlign: "center", textAlignVertical: "center", color: colors.onPrimaryFixed, fontSize: typography.size.xl, fontFamily: font.family },
  name: { fontSize: typography.size.xl, fontFamily: font.family, color: colors.ink },
  email: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted },
  badgeRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap", justifyContent: "center" },
  logoutButton: { marginTop: spacing.xl },
});
