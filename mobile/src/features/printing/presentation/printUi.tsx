import { colors as appColors } from "../../../core/ui/theme";
import { Skeleton } from "../../../core/components/Skeleton";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Switch, View } from "react-native";

import type { PrintRequest, PrintStatus } from "../data/printingApi";

export const statusConfig: Record<
  PrintStatus,
  { label: string; bg: string; text: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  open: {
    label: "Open Request",
    bg: appColors.surfaceMuted,
    text: appColors.primary,
    icon: "clock-outline",
  },
  accepted: {
    label: "Being Printed",
    bg: "#FFFBEB",
    text: "#B45309",
    icon: "printer-pos",
  },
  done: {
    label: "Ready for Pickup",
    bg: appColors.surfaceMuted,
    text: appColors.primary,
    icon: "check-circle",
  },
  cancelled: {
    label: "Cancelled",
    bg: "#FEF2F2",
    text: "#DC2626",
    icon: "close-circle-outline",
  },
};

export function describeSettings(request: PrintRequest) {
  const pages = request.page_range ? `Pages ${request.page_range}` : "All pages";
  const parts = [pages, `${request.copies} ${request.copies === 1 ? "copy" : "copies"}`];
  parts.push(request.is_color ? "Colour" : "B/W");
  parts.push(request.is_double_sided ? "Double-sided" : "Single-sided");
  return parts.join(" · ");
}

export function RequestCard({ request, footer }: { request: PrintRequest; footer?: string }) {
  const status = statusConfig[request.status] || statusConfig.open;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(app)/printing/${request.id}`)}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.fileIconWrap}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color={appColors.primary} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.docName} numberOfLines={1}>
            {request.document_name}
          </Text>
          <Text style={styles.settingsText}>{describeSettings(request)}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <MaterialCommunityIcons name={status.icon} size={12} color={status.text} style={{ marginRight: 3 }} />
          <Text style={[styles.statusBadgeText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText} numberOfLines={1}>
          {footer ?? new Date(request.created_at).toLocaleString()}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color={appColors.primary} />
      </View>
    </Pressable>
  );
}

export function RequestSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <Skeleton width={38} height={38} borderRadius={10} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="75%" height={16} borderRadius={4} />
          <Skeleton width="55%" height={12} borderRadius={4} />
        </View>
        <Skeleton width={80} height={22} borderRadius={8} />
      </View>
      <View style={styles.cardFooter}>
        <Skeleton width="45%" height={12} borderRadius={4} />
        <Skeleton width={16} height={16} borderRadius={4} />
      </View>
    </View>
  );
}

// Read-only row of 5 stars (score) or a tappable picker when onChange is given.
export function Stars({ score, onChange }: { score: number; onChange?: (score: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange?.(n)} disabled={!onChange} hitSlop={4}>
          <MaterialCommunityIcons
            name={n <= score ? "star" : "star-outline"}
            size={onChange ? 30 : 16}
            color="#FDBF1E"
          />
        </Pressable>
      ))}
    </View>
  );
}

export function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchTextGroup}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.switchHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: appColors.primary, false: appColors.border }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export const printStyles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "800", color: appColors.text },
  subtitle: { fontSize: 13, color: appColors.textSecondary },
  error: { fontSize: 12, fontWeight: "600", color: "#DC2626" },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fileIconWrap: {
    width: 38,
    height: 38,


    alignItems: "center",
    justifyContent: "center",
  },
  docName: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
  },
  settingsText: {
    fontSize: 11,
    color: appColors.textSecondary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingTop: 8,
    marginTop: 2,
  },
  footerText: {
    fontSize: 11,
    color: appColors.textSecondary,
    flex: 1,
  },
  stars: {
    flexDirection: "row",
    gap: 3,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: appColors.background,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 12,
  },
  switchTextGroup: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  switchHint: {
    fontSize: 11,
    color: appColors.textSecondary,
  },
});
