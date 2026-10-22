import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ModuleOptionsMenu, type ModuleDropdownItem } from "../../../core/components/ModuleOptionsMenu";
import { getMyPrinterProfile, listMyPrintRequests, listPrinters, type PrinterProfile } from "../data/printingApi";
import { Stars } from "./printUi";

function PrinterSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={styles.avatarSkeleton} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.titleSkeleton} />
          <View style={styles.subSkeleton} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
        <View style={styles.badgeSkeleton} />
        <View style={styles.badgeSkeleton} />
      </View>
    </View>
  );
}

export default function PrintCentreScreen() {
  const insets = useSafeAreaInsets();
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [myProfile, setMyProfile] = useState<PrinterProfile | null>(null);
  const [incomingCount, setIncomingCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const filteredPrinters = useMemo(() => {
    if (!searchQuery.trim()) return printers;
    const q = searchQuery.toLowerCase();
    return printers.filter(
      (p) =>
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        (p.department && p.department.toLowerCase().includes(q)) ||
        (p.location_note && p.location_note.toLowerCase().includes(q)),
    );
  }, [printers, searchQuery]);

  const dropdownItems: ModuleDropdownItem[] = useMemo(
    () => [
      {
        key: "my_requests",
        label: "My Print Requests",
        subtitle: "Documents you requested for printing",
        icon: "file-document-multiple-outline",
        iconColor: appColors.primary,
        onPress: () => router.push("/(app)/printing/my-requests" as any),
      },
      {
        key: "my_jobs",
        label: "My Print Jobs",
        subtitle: "Orders you accepted or printed for peers",
        icon: "tray-full",
        iconColor: appColors.primary,
        hasDot: incomingCount > 0,
        onPress: () => router.push("/(app)/printing/my-jobs" as any),
      },
      {
        key: "printer_settings",
        label: myProfile ? "Printer Settings" : "Register as a Campus Printer",
        subtitle: myProfile ? "Manage your pricing & availability" : "Earn by printing documents for peers",
        icon: "printer-settings",
        iconColor: "#FDBF1E",
        onPress: () => router.push("/(app)/printing/printer" as any),
      },
    ],
    [myProfile, incomingCount],
  );

  return (
    <View style={styles.container}>
      {/* Top Nav Bar */}
      <View style={[styles.compactTopNav, { paddingTop: topOffset > 0 ? topOffset : 4 }]}>
        <Text style={styles.compactNavTitle}>Print Centre</Text>
        <ModuleOptionsMenu items={dropdownItems} hasNotification={incomingCount > 0} />
      </View>



      {/* Quick Action Navigation Buttons */}
      <View style={styles.quickNavRow}>
        <Pressable
          style={styles.quickNavBtn}
          onPress={() => router.push("/(app)/printing/my-requests" as any)}
        >
          <MaterialCommunityIcons name="file-document-outline" size={16} color={appColors.primary} />
          <Text style={styles.quickNavText}>My Requests</Text>
        </Pressable>

        <Pressable
          style={[styles.quickNavBtn, incomingCount > 0 && styles.quickNavBtnHighlight]}
          onPress={() => router.push("/(app)/printing/my-jobs" as any)}
        >
          <MaterialCommunityIcons name="tray-full" size={16} color={appColors.primary} />
          <Text style={styles.quickNavText}>My Print Jobs</Text>
          {incomingCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{incomingCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color={appColors.textSecondary} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search printers by name, department, or hall..."
            placeholderTextColor={appColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <MaterialCommunityIcons name="close-circle" size={16} color={appColors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>Available Campus Printers</Text>
        <Text style={styles.printersCount}>{filteredPrinters.length} available</Text>
      </View>

      {/* Printers List */}
      {isLoading ? (
        <View style={{ gap: 12, padding: 16 }}>
          <PrinterSkeletonCard />
          <PrinterSkeletonCard />
          <PrinterSkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPrinters}
          keyExtractor={(printer) => String(printer.id)}
          contentContainerStyle={[
            filteredPrinters.length === 0 ? styles.emptyList : styles.list,
            { paddingBottom: Math.max(insets.bottom + 85, 110) },
          ]}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="printer-off" size={48} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Printers Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? "No printers match your search query."
                  : "No students have registered as printers yet. Be the first to register!"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/(app)/printing/new",
                  params: { printerId: String(item.id), printerName: item.full_name },
                } as any)
              }
            >
              <View style={styles.cardHeader}>
                <View style={styles.printerAvatarCircle}>
                  <MaterialCommunityIcons name="printer-outline" size={22} color={appColors.primary} />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.printerTitleRow}>
                    <Text style={styles.printerName} numberOfLines={1}>
                      {item.full_name || "Campus Printer"}
                    </Text>
                    {item.department ? (
                      <View style={styles.deptBadge}>
                        <Text style={styles.deptBadgeText}>{item.department}</Text>
                      </View>
                    ) : null}
                  </View>

                  {item.location_note ? (
                    <View style={styles.locationRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={13} color={appColors.textSecondary} style={{ marginRight: 3 }} />
                      <Text style={styles.locationText} numberOfLines={1}>{item.location_note}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.capabilitiesRow}>
                <View style={[styles.capBadge, item.supports_color ? styles.capColor : styles.capBw]}>
                  <MaterialCommunityIcons
                    name={item.supports_color ? "palette-outline" : "format-color-text"}
                    size={12}
                    color={item.supports_color ? appColors.primary : appColors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.capText, { color: item.supports_color ? appColors.primary : appColors.textSecondary }]}>
                    {item.supports_color ? "Colour Printing" : "Black & White Only"}
                  </Text>
                </View>

                {item.supports_double_sided && (
                  <View style={[styles.capBadge, styles.capDouble]}>
                    <MaterialCommunityIcons name="book-open-outline" size={12} color={appColors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.capText, { color: appColors.primary }]}>Double-Sided</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.ratingWrap}>
                  <Stars score={Math.round(item.average_rating ?? 0)} />
                  <Text style={styles.ratingText}>
                    {item.rating_count ? `${item.average_rating} (${item.rating_count})` : "No ratings"}
                  </Text>
                </View>

                <View style={styles.requestActionBtn}>
                  <Text style={styles.requestActionText}>Order Print</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={appColors.primary} />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Floating Action Button (New Print Request) */}
      <Pressable
        style={[
          styles.floatingAddBtn,
          { bottom: Math.max(insets.bottom + 65, 80) },
        ]}
        onPress={() => router.push("/(app)/printing/new" as any)}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  compactTopNav: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EFF0EF",
  },
  compactNavTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: appColors.primary,
    letterSpacing: -0.3,
  },
  bannerRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bannerCard: {
    backgroundColor: appColors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 10,
  },
  bannerIconCircle: {
    width: 38,
    height: 38,


    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.primary,
  },
  bannerSub: {
    fontSize: 11,
    color: appColors.primary,
    lineHeight: 16,
  },
  quickNavRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  quickNavBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    paddingVertical: 8,
    gap: 6,
  },
  quickNavBtnHighlight: {
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceMuted,
  },
  quickNavText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.primary,
  },
  countBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  searchBarRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 7,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: appColors.text,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
  },
  printersCount: {
    fontSize: 12,
    color: appColors.textSecondary,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: appColors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  printerAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: appColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  printerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  printerName: {
    fontSize: 15,
    fontWeight: "700",
    color: appColors.text,
    flex: 1,
  },
  deptBadge: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: appColors.primary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: appColors.textSecondary,
  },
  capabilitiesRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  capBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  capColor: {
    backgroundColor: appColors.surfaceMuted,
  },
  capBw: {
    backgroundColor: appColors.border,
  },
  capDouble: {
    backgroundColor: appColors.surfaceMuted,
  },
  capText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingTop: 10,
    marginTop: 2,
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: {
    fontSize: 12,
    color: appColors.textSecondary,
    fontWeight: "500",
  },
  requestActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  requestActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.primary,
  },
  floatingAddBtn: {
    position: "absolute",
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: appColors.primary,
    borderWidth: 1.5,
    borderColor: appColors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  avatarSkeleton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: appColors.border,
  },
  titleSkeleton: {
    width: "60%",
    height: 14,
    borderRadius: 4,
    backgroundColor: appColors.border,
  },
  subSkeleton: {
    width: "40%",
    height: 10,
    borderRadius: 4,
    backgroundColor: appColors.border,
  },
  badgeSkeleton: {
    width: 80,
    height: 20,
    borderRadius: 6,
    backgroundColor: appColors.border,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },
});
