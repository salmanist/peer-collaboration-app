import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { Badge, Card, colors, font, spacing, typography } from "../../../core/ui";
import type { PrintRequest, PrintStatus } from "../data/printingApi";

export const statusTone: Record<PrintStatus, { label: string; tone: "primary" | "warning" | "success" | "neutral" }> = {
  open: { label: "Open", tone: "primary" },
  accepted: { label: "Being printed", tone: "warning" },
  done: { label: "Ready", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function describeSettings(request: PrintRequest) {
  const pages = request.page_range ? `Pages ${request.page_range}` : "All pages";
  const parts = [pages, `${request.copies} ${request.copies === 1 ? "copy" : "copies"}`];
  parts.push(request.is_color ? "Colour" : "B/W");
  parts.push(request.is_double_sided ? "Double-sided" : "Single-sided");
  return parts.join(" · ");
}

export function RequestCard({ request, footer }: { request: PrintRequest; footer?: string }) {
  const tone = statusTone[request.status];
  return (
    <Pressable onPress={() => router.push(`/(app)/printing/${request.id}`)}>
      <Card contentStyle={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.docName} numberOfLines={1}>{request.document_name}</Text>
          <Badge label={tone.label} tone={tone.tone} />
        </View>
        <Text style={styles.settings}>{describeSettings(request)}</Text>
        <Text style={styles.meta}>{footer ?? new Date(request.created_at).toLocaleString()}</Text>
      </Card>
    </Pressable>
  );
}

// Read-only row of 5 stars (score) or a tappable picker when onChange is given.
export function Stars({ score, onChange }: { score: number; onChange?: (score: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange?.(n)} disabled={!onChange} hitSlop={4}>
          <MaterialCommunityIcons name={n <= score ? "star" : "star-outline"} size={onChange ? 30 : 16} color={colors.warning} />
        </Pressable>
      ))}
    </View>
  );
}

export function SwitchRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchTextGroup}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.switchHint}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.surfaceMuted }} thumbColor={colors.surface} />
    </View>
  );
}

export const printStyles = StyleSheet.create({
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink },
  subtitle: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
});

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  docName: { flex: 1, fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  settings: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
  meta: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  stars: { flexDirection: "row", gap: 2 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  switchTextGroup: { flex: 1 },
  switchLabel: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  switchHint: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
});
