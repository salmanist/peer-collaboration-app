import { colors as appColors } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../../../core/ui/AppText";
import { apiClient } from "../../../core/network/apiClient";

export type ManagedModule = "library" | "printing" | "rides";
type RecordItem = { id: number; title: string; description: string; owner_email: string; status: string; actions: string[] };
type Result = { count: number; next: string | null; previous: string | null; results: RecordItem[] };
const sections = {
  library: [{ key: "projects", label: "Projects" }, { key: "notes", label: "Notes" }],
  printing: [{ key: "requests", label: "Print Requests" }, { key: "printers", label: "Printers" }, { key: "ratings", label: "Ratings" }],
  rides: [{ key: "rides", label: "Shared Rides" }, { key: "requests", label: "Join Requests" }, { key: "on_demand", label: "On-demand Rides" }, { key: "profiles", label: "Driver Approvals" }],
};
const labels: Record<string, string> = { approve: "Approve driver", revoke: "Revoke approval", approved: "Approve", rejected: "Reject", pending: "Mark pending", cancel: "Cancel", decline: "Decline", delete: "Delete" };
const errorMessage = (err: any) => err?.response?.data?.detail || "Could not complete the request. Please try again.";

export function AdminModulePanel({ module, refreshing }: { module: ManagedModule; refreshing: boolean }) {
  const [kind, setKind] = useState(sections[module][0].key);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ item: RecordItem; action: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    apiClient.get<Result>(`/admin/modules/${module}/`, { params: { kind, page, search: query }, signal: controller.signal })
      .then(res => { if (!controller.signal.aborted) setData(res.data); })
      .catch(err => { if (!controller.signal.aborted) { setError(errorMessage(err)); setData(null); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [module, kind, page, query, refreshing, revision]);

  const act = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError("");
    try {
      await apiClient.patch(`/admin/modules/${module}/`, { id: pending.item.id, action: pending.action }, { params: { kind } });
      setPending(null);
      if (data?.results.length === 1 && page > 1) setPage(page - 1);
      else setRevision(value => value + 1);
    } catch (err) {
      setPending(null);
      setError(errorMessage(err));
    } finally { setBusy(false); }
  }, [pending, busy, module, kind, data, page]);

  return <View style={styles.section}>
    <View style={styles.row}>{sections[module].map(tab => <Pressable key={tab.key} style={[styles.tab, kind === tab.key && styles.selected]} onPress={() => { setKind(tab.key); setPage(1); setSearch(""); setQuery(""); }}>
      <Text style={{ color: kind === tab.key ? "#fff" : appColors.primary }}>{tab.label}</Text>
    </Pressable>)}</View>
    <TextInput accessibilityLabel="Search admin records" placeholder="Search by title, email, or record ID" value={search} onChangeText={setSearch} style={styles.input} />
    <View style={styles.row}><Text>{data?.count ?? 0} records</Text><Pressable onPress={() => setRevision(v => v + 1)}><Text style={styles.link}>Refresh</Text></Pressable></View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {loading ? <LoadingSkeleton variant="list" /> : data?.results.length === 0 ? <Text>No records found.</Text> : data?.results.map(item => <View key={item.id} style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.meta}>#{item.id} · {item.owner_email}</Text>
      {!!item.description && <Text>{item.description}</Text>}
      {!!item.status && <Text style={styles.link}>Status: {item.status.replaceAll("_", " ")}</Text>}
      <View style={styles.row}>{item.actions.map(action => <Pressable key={action} disabled={busy} style={styles.action} onPress={() => setPending({ item, action })}>
        <Text style={{ color: action === "delete" ? "#B91C1C" : appColors.primary }}>{labels[action] || action}</Text>
      </Pressable>)}</View>
    </View>)}
    {!!data && <View style={styles.row}>
      <Pressable disabled={!data.previous || loading} onPress={() => setPage(v => v - 1)} style={{ opacity: data.previous ? 1 : 0.4 }}><Text>Previous</Text></Pressable>
      <Text>Page {page}</Text>
      <Pressable disabled={!data.next || loading} onPress={() => setPage(v => v + 1)} style={{ opacity: data.next ? 1 : 0.4 }}><Text>Next</Text></Pressable>
    </View>}
    <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => { if (!busy) setPending(null); }}>
      <View style={styles.overlay}><View style={styles.dialog}>
        <Text style={styles.title}>{labels[pending?.action || ""]} record?</Text>
        <Text>{pending?.item.title}</Text>
        <Text>{pending?.action === "delete" ? "This permanently removes the record and its related data." : "This changes the record for all participants."}</Text>
        <View style={styles.row}>
          <Pressable disabled={busy} onPress={() => setPending(null)} style={styles.action}><Text>Go back</Text></Pressable>
          <Pressable disabled={busy} onPress={() => void act()} style={[styles.tab, styles.selected]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff" }}>Confirm</Text>}</Pressable>
        </View>
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 14 }, row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 },
  tab: { padding: 10, borderRadius: 8, backgroundColor: appColors.surfaceMuted }, selected: { backgroundColor: appColors.primary },
  input: { backgroundColor: "#fff", padding: 12, borderWidth: 1, borderColor: appColors.border, borderRadius: 10, ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}) },
  card: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: appColors.border, padding: 16, gap: 10 },
  title: { fontSize: 16, fontWeight: "700", color: appColors.primary }, meta: { fontSize: 12, color: appColors.textSecondary },
  link: { color: appColors.primary, fontWeight: "600" }, error: { color: "#B91C1C" }, action: { padding: 10, borderRadius: 8, backgroundColor: appColors.border },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", padding: 24 },
  dialog: { backgroundColor: "#fff", borderRadius: 16, padding: 24, gap: 16, width: "100%", maxWidth: 440 },
});
