import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, ScreenContainer, Skeleton, colors, font, spacing, typography, NavClearance } from "../../../core/ui";
import { listMyPrintRequests, listOpenPrintRequests, type PrintRequest } from "../data/printingApi";
import { RequestCard, printStyles } from "./printUi";

interface JobSection {
  title: string;
  data: PrintRequest[];
}

export default function MyPrintJobsScreen() {
  const [sections, setSections] = useState<JobSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [incoming, pool, mine] = await Promise.all([
        listMyPrintRequests("incoming"),
        listOpenPrintRequests(),
        listMyPrintRequests("printer"),
      ]);
      const all = [
        { title: "Sent to me", data: incoming.results },
        { title: "Open requests", data: pool.results },
        { title: "In progress", data: mine.results.filter((r) => r.status === "accepted") },
        { title: "Completed", data: mine.results.filter((r) => r.status === "done") },
      ];
      setSections(all.filter((section) => section.data.length));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't load your print jobs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer style={styles.screen} back="/(app)/printing">
      <SectionList
        ListFooterComponent={NavClearance}
        sections={sections}
        keyExtractor={(request) => String(request.id)}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={printStyles.title}>My print jobs</Text>
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
            <EmptyState icon="printer-outline" title="Nothing to print" subtitle="Requests sent to you and open requests from other students show up here." />
          )
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        renderItem={({ item, section }) => (
          <RequestCard
            request={item}
            footer={section.title === "Completed" ? `Done ${new Date(item.completed_at ?? item.created_at).toLocaleString()}` : `From ${item.requester.full_name || item.requester.email}`}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  listContent: { padding: spacing.lg, flexGrow: 1 },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  sectionTitle: { fontSize: typography.size.lg, fontFamily: font.serif, color: colors.ink, marginTop: spacing.md, marginBottom: spacing.sm },
  separator: { height: spacing.md },
  card: { gap: spacing.xs },
  skeletonTitle: { width: "60%", height: 16 },
  skeletonLine: { width: "80%", height: 11, marginTop: spacing.xs },
});
