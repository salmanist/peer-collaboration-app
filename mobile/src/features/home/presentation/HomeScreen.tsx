import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import { ScreenContainer, SoftBlock, colors, font, spacing, typography } from "../../../core/ui";

const MODULES = [
  { key: "rides", icon: "car-outline", name: "Ride Sharing", href: "/(app)/rides" },
  { key: "library", icon: "book-open-variant-outline", name: "Digital Library", href: "/(app)/library" },
] as const;

export default function HomeScreen() {
  const user = useSessionStore((state) => state.user);
  if (!user) return null;

  return (
    <ScreenContainer scroll topBar="home">
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back, {user.full_name.split(" ")[0]}</Text>
        <Text style={styles.subtitle}>Here's a quick overview of your ride sharing and library activity.</Text>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        {MODULES.map((module) => (
          <Pressable key={module.key} style={styles.moduleCard} onPress={() => router.push(module.href)}>
            <SoftBlock backgroundColor={colors.primaryFixed} pill size={48} flat>
              <MaterialCommunityIcons name={module.icon} size={24} color={colors.onPrimaryFixed} />
            </SoftBlock>
            <Text style={styles.moduleName}>{module.name}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xl },
  title: { fontSize: typography.size.xl, fontFamily: font.family, color: colors.ink },
  subtitle: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary, maxWidth: "90%" },
  sectionTitle: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink, marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  moduleCard: {
    width: "47%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  moduleName: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.ink, textAlign: "center" },
});
