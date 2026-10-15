import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { OverscrollFill, Badge, Button, Card, EmptyState, ScreenContainer, Skeleton, SoftBlock, colors, font, radius, spacing, typography, NavClearance } from "../../../core/ui";
import { getMyPrinterProfile, listMyPrintRequests, listPrinters, type PrinterProfile } from "../data/printingApi";
import { Stars, printStyles } from "./printUi";

export default function PrintCentreScreen() {
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [myProfile, setMyProfile] = useState<PrinterProfile | null>(null);
  const [incomingCount, setIncomingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [printerList, profile] = await Promise.all([listPrinters(), getMyPrinterProfile()]);
      setPrinters(printerList.results);
      setMyProfile(profile);
      setIncomingCount(profile ? (await listMyPrintRequests("incoming")).count : 0);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't load Print Centre.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer style={styles.screen} topBar="printing">
      <FlatList
        ListFooterComponent={NavClearance}
        data={printers}
        keyExtractor={(printer) => String(printer.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.hero}>
        <OverscrollFill />
              <View style={styles.heroTitleGroup}>
                <Text style={styles.heroTitle}>Print Centre</Text>
                <Text style={styles.heroSubtitle}>Get documents printed by fellow students</Text>
              </View>
              <View style={styles.heroActions}>
                <Pressable style={styles.heroPill} onPress={() => router.push("/(app)/printing/printer")}>
                  <MaterialCommunityIcons name="printer-outline" size={16} color={colors.surface} />
                  <Text style={styles.heroPillText}>{myProfile ? "Printer settings" : "Register as printer"}</Text>
                </Pressable>
                <Pressable onPress={() => router.push("/(app)/rides/notifications")} accessibilityLabel="Notifications">
                  <SoftBlock backgroundColor="rgba(255,255,255,0.15)" borderColor="transparent" pill size={40} flat>
                    <MaterialCommunityIcons name="bell-outline" size={20} color={colors.surface} />
                  </SoftBlock>
                </Pressable>
              </View>
            </View>

            <View style={styles.headerBody}>
              <Button label="New request" onPress={() => router.push("/(app)/printing/new")} />
              <View style={styles.buttonRow}>
                <View style={styles.buttonCell}>
                  <Button label="My requests" variant="ghost" onPress={() => router.push("/(app)/printing/my-requests")} />
                </View>
                {myProfile && (
                  <View style={styles.buttonCell}>
                    <Button label="My print jobs" variant="ghost" onPress={() => router.push("/(app)/printing/my-jobs")} />
                    {incomingCount > 0 && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{incomingCount}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {error && <Text style={printStyles.error}>{error}</Text>}
              <Text style={styles.sectionTitle}>Printers</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.itemPad}>
              <Card contentStyle={styles.card}>
                <Skeleton style={styles.skeletonTitle} />
                <Skeleton style={styles.skeletonLine} />
              </Card>
            </View>
          ) : (
            <EmptyState icon="printer-outline" title="No printers yet" subtitle="Be the first - register as a printer, or post a request for anyone." />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.itemPad}
            onPress={() => router.push({ pathname: "/(app)/printing/new", params: { printerId: String(item.id), printerName: item.full_name } })}
          >
            <Card contentStyle={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.printerName} numberOfLines={1}>{item.full_name || "Printer"}</Text>
                {item.department ? <Badge label={item.department} tone="secondary" /> : null}
              </View>
              {item.location_note ? (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.location}>{item.location_note}</Text>
                </View>
              ) : null}
              <View style={styles.badgeRow}>
                <Badge label={item.supports_color ? "Colour" : "B/W only"} tone={item.supports_color ? "primary" : "neutral"} />
                {item.supports_double_sided && <Badge label="Double-sided" tone="primary" />}
              </View>
              <View style={styles.ratingRow}>
                <Stars score={Math.round(item.average_rating ?? 0)} />
                <Text style={styles.ratingText}>
                  {item.rating_count ? `${item.average_rating} (${item.rating_count})` : "No ratings yet"}
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  listContent: { paddingBottom: spacing.lg, gap: spacing.md, flexGrow: 1 },
  header: { gap: spacing.md },
  hero: {
    backgroundColor: colors.primaryContainer,
    borderBottomLeftRadius: radius.hero,
    borderBottomRightRadius: radius.hero,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroTitleGroup: { gap: 2, marginBottom: spacing.sm },
  heroTitle: { fontSize: typography.size.xl, fontFamily: font.family, color: colors.surface },
  heroSubtitle: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.onPrimaryContainer },
  heroActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  heroPillText: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.surface },
  headerBody: { gap: spacing.md, paddingHorizontal: spacing.lg },
  itemPad: { paddingHorizontal: spacing.lg },
  buttonRow: { flexDirection: "row", gap: spacing.sm },
  buttonCell: { flex: 1 },
  countBadge: {
    position: "absolute",
    top: -6,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.onDanger },
  sectionTitle: { fontSize: typography.size.lg, fontFamily: font.serif, color: colors.ink },
  card: { gap: spacing.xs },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  printerName: { flex: 1, fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  locationRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  location: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary },
  badgeRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ratingText: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  skeletonTitle: { width: "50%", height: 16 },
  skeletonLine: { width: "70%", height: 11, marginTop: spacing.xs },
});
