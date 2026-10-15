import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, ScreenContainer, Skeleton, spacing, NavClearance } from "../../../core/ui";
import { listMyPrintRequests, type PrintRequest } from "../data/printingApi";
import { RequestCard, printStyles } from "./printUi";

function footerFor(request: PrintRequest) {
  if (request.printer) return `Printer: ${request.printer.full_name || request.printer.email}`;
  if (request.target_printer) return `Sent to ${request.target_printer.full_name || request.target_printer.email}`;
  return new Date(request.created_at).toLocaleString();
}

export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer style={styles.screen} back="/(app)/printing">
      <FlatList
        ListFooterComponent={NavClearance}
        data={requests}
        keyExtractor={(request) => String(request.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={printStyles.title}>My requests</Text>
            {error && <Text style={printStyles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <Card contentStyle={styles.card}>
              <Skeleton style={styles.skeletonTitle} />
              <Skeleton style={styles.skeletonLine} />
            </Card>
          ) : (
            <EmptyState icon="printer-outline" title="No requests yet" subtitle="Requests you send will show up here, past and current." />
          )
        }
        renderItem={({ item }) => <RequestCard request={item} footer={footerFor(item)} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  listContent: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  header: { gap: spacing.xs },
  card: { gap: spacing.xs },
  skeletonTitle: { width: "60%", height: 16 },
  skeletonLine: { width: "80%", height: 11, marginTop: spacing.xs },
});
