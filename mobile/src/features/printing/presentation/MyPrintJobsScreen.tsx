import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  SectionList,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listMyPrintRequests, listOpenPrintRequests, type PrintRequest } from "../data/printingApi";
import { RequestCard, RequestSkeletonCard } from "./printUi";

interface JobSection {
  title: string;
  data: PrintRequest[];
}

export default function MyPrintJobsScreen() {
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<JobSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [incoming, pool, mine] = await Promise.all([
        listMyPrintRequests("incoming"),
        listOpenPrintRequests(),
        listMyPrintRequests("printer"),
      ]);
      const all = [
        { title: "Sent Directly to Me", data: incoming.results },
        { title: "Open Campus Requests", data: pool.results },
        { title: "In Progress", data: mine.results.filter((r) => r.status === "accepted") },
        { title: "Completed Orders", data: mine.results.filter((r) => r.status === "done") },
      ];
      setSections(all.filter((section) => section.data.length));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't load your print jobs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/printing")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
        </Pressable>
        <Text style={styles.topNavTitle}>My Print Jobs</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <RequestSkeletonCard />
          <RequestSkeletonCard />
          <RequestSkeletonCard />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(request) => String(request.id)}
          contentContainerStyle={[
            sections.length === 0 ? styles.emptyList : styles.list,
            { paddingBottom: Math.max(insets.bottom + 20, 40) },
          ]}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="tray-full" size={48} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Orders Yet</Text>
              <Text style={styles.emptySub}>
                When students submit print requests for you or into the open pool, they will show up here.
              </Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
              </View>
            </View>
          )}
          renderItem={({ item, section }) => (
            <RequestCard
              request={item}
              footer={
                section.title === "Completed Orders"
                  ? `Done ${new Date(item.completed_at ?? item.created_at).toLocaleString()}`
                  : `From ${item.requester.full_name || item.requester.email}`
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  topNavBar: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    backgroundColor: appColors.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 8 + headerGrow,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: appColors.headerBg,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appColors.headerControlBg,
    borderWidth: 1,
    borderColor: appColors.headerControlBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.onHeader,
  },
  skeletonContainer: {
    padding: 16,
    gap: 12,
    width: "100%",
  },
  list: {
    padding: 16,
    gap: 10,
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
    marginBottom: 16,
  },
  sectionHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: appColors.text,
  },
  sectionBadge: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
  },
});
