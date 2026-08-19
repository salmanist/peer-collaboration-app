import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import { fetchMyPublicResourceOffers, fetchPublicResourceRequests } from "../data/resourcesApi";
import type { PublicResourceOffer, PublicResourceRequest } from "../resources";

function toLabel(value: string) {
  return value.replace("_", " ");
}

export default function PublicResourceRequestsScreen() {
  const [requests, setRequests] = useState<PublicResourceRequest[]>([]);
  const [myOffers, setMyOffers] = useState<PublicResourceOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const user = useSessionStore((state) => state.user);

  const loadRequests = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage("");

    try {
      const [requestsResponse, offersResponse] = await Promise.all([
        fetchPublicResourceRequests({ page: 1 }),
        fetchMyPublicResourceOffers(),
      ]);
      setRequests(requestsResponse.results);
      setMyOffers(offersResponse.results);
      setPage(1);
      setHasNextPage(Boolean(requestsResponse.next));
    } catch {
      setErrorMessage("Could not load resource requests.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMoreRequests = async () => {
    if (!hasNextPage || isLoadingMore || isLoading || isRefreshing) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const response = await fetchPublicResourceRequests({ page: nextPage });
      setRequests((current) => [...current, ...response.results]);
      setPage(nextPage);
      setHasNextPage(Boolean(response.next));
    } catch {
      // Retain current list
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const renderItem = useCallback(({ item: request }: { item: PublicResourceRequest }) => {
    const existingOffer = myOffers.find((offer) => offer.public_request_id === request.id);
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{request.title}</Text>
        <Text style={styles.exchange}>Looking to {toLabel(request.desired_exchange_type)}</Text>
        <Text style={styles.description}>{request.description}</Text>
        <Text style={styles.meta}>{toLabel(request.category)} · Requested by {request.requester_name}</Text>
        {request.requester_id === user?.id ? <Text style={styles.ownRequest}>Your request</Text> : null}
        {request.requester_id !== user?.id ? (
          existingOffer ? (
            <Text style={styles.offerSent}>Offer sent: {existingOffer.status}</Text>
          ) : (
            <Pressable style={styles.offerButton} onPress={() => router.push(`/resources/wanted/offer/${request.id}`)}>
              <Text style={styles.offerButtonText}>Send offer</Text>
            </Pressable>
          )
        ) : null}
      </View>
    );
  }, [myOffers, user?.id]);

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1d4ed8" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Request Resources</Text>
          <Text style={styles.subtitle}>See what LGU students are looking for.</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push("/resources/wanted/create")}>
          <Text style={styles.addButtonText}>Request</Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefreshing}
        onRefresh={() => void loadRequests(true)}
        onEndReached={() => void loadMoreRequests()}
        onEndReachedThreshold={0.4}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
        contentContainerStyle={requests.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No open resource requests yet.</Text>}
        ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color="#1d4ed8" style={{ marginVertical: 12 }} /> : null}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flex: 1, padding: 20, paddingTop: 56, paddingBottom: 20 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { color: "#0f172a", fontSize: 26, fontWeight: "700" },
  subtitle: { color: "#64748b", marginTop: 4 },
  addButton: { backgroundColor: "#1d4ed8", borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 },
  addButtonText: { color: "#ffffff", fontWeight: "700" },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 12, padding: 16 },
  cardTitle: { color: "#0f172a", fontSize: 17, fontWeight: "700" },
  exchange: { color: "#1d4ed8", fontWeight: "700", textTransform: "capitalize" },
  description: { color: "#475569", lineHeight: 20 },
  meta: { color: "#64748b", textTransform: "capitalize" },
  ownRequest: { color: "#64748b", fontWeight: "700" },
  offerSent: { color: "#047857", fontWeight: "700", textTransform: "capitalize" },
  offerButton: { alignSelf: "flex-start", backgroundColor: "#047857", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 },
  offerButtonText: { color: "#ffffff", fontWeight: "700" },
  emptyText: { color: "#64748b", textAlign: "center" },
  errorText: { color: "#b91c1c", marginBottom: 12 },
});

