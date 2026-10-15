import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fetchMe } from "../auth";
import { useSessionStore } from "../../../core/auth/session";
import { Badge, Button, Card, ScreenContainer, SoftBlock, colors, font, spacing, typography } from "../../../core/ui";

function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function titleCase(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

export default function ProfileScreen() {
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clearSession);
  const updateUser = useSessionStore((state) => state.updateUser);

  // The cached session user can go stale (e.g. roster info added after the
  // account first logged in) — refresh from the server whenever this screen
  // is opened instead of only trusting whatever was stored at login.
  useFocusEffect(
    useCallback(() => {
      fetchMe().then(updateUser).catch(() => {});
    }, [updateUser])
  );

  if (!user) return null;

  const handleLogout = async () => {
    await clearSession();
    router.replace("/(auth)/login");
  };

  const rows = [
    { label: "Email", value: user.email },
    { label: "Department", value: user.department || "—" },
    { label: "Enrollment year", value: user.enrollment_year ? String(user.enrollment_year) : "—" },
    { label: "Gender", value: user.gender ? titleCase(user.gender) : "—" },
    { label: "Role", value: titleCase(user.role) },
    { label: "Email verified", value: user.is_email_verified ? "Yes" : "No" },
    { label: "Member since", value: new Date(user.created_at).toLocaleDateString() },
  ];

  return (
    <ScreenContainer scroll topBar>
      <View style={styles.header}>
        <SoftBlock backgroundColor={colors.primaryFixed} pill size={84} style={styles.avatarBlock}>
          <Text style={styles.avatarText}>{initials(user.full_name)}</Text>
        </SoftBlock>
        <Text style={styles.name}>{user.full_name}</Text>
        <Badge label={titleCase(user.role)} tone="primary" />
      </View>

      <Card contentStyle={styles.infoCard}>
        {rows.map((row, index) => (
          <View key={row.label} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>{row.label}</Text>
            <Text style={styles.infoValue}>{row.value}</Text>
          </View>
        ))}
      </Card>

      <Button label="Log out" variant="ink" onPress={handleLogout} style={styles.logoutButton} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.lg },
  avatarBlock: { marginBottom: spacing.sm },
  avatarText: { textAlign: "center", color: colors.onPrimaryFixed, fontSize: typography.size.xl, fontFamily: font.family },
  name: { fontSize: typography.size.xl, fontFamily: font.family, color: colors.ink },
  infoCard: { gap: 0, padding: 0 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  infoLabel: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted },
  infoValue: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.ink, flexShrink: 1, textAlign: "right" },
  logoutButton: { marginTop: spacing.xl },
});
