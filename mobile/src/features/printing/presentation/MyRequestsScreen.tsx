import { colors as appColors } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listMyPrintRequests, type PrintRequest } from "../data/printingApi";
import { RequestCard, RequestSkeletonCard } from "./printUi";

function footerFor(request: PrintRequest) {
  if (request.printer) return `Printer: ${request.printer.full_name || request.printer.email}`;
  if (request.target_printer) return `Sent to ${request.target_printer.full_name || request.target_printer.email}`;
  return new Date(request.created_at).toLocaleString();
}

export default function MyRequestsScreen() {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const load = useCallback(async () => {
    setError(null);
    try {
      setRequests((await listMyPrintRequests("requester")).results);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't load your requests.");
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
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>My Print Requests</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <RequestSkeletonCard />
          <RequestSkeletonCard />
          <RequestSkeletonCard />
          <RequestSkeletonCard />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(request) => String(request.id)}
          contentContainerStyle={[
            requests.length === 0 ? styles.emptyList : styles.list,
            { paddingBottom: Math.max(insets.bottom + 20, 40) },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Print Requests</Text>
              <Text style={styles.emptySub}>
                Requests you submit to campus printers will show up here.
              </Text>
              <Pressable
                style={styles.newRequestBtn}
                onPress={() => router.push("/(app)/printing/new" as any)}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.newRequestBtnText}>New Print Request</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => <RequestCard request={item} footer={footerFor(item)} />}
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.primary,
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
  newRequestBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDBF1E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newRequestBtnText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "800",
  },
});
