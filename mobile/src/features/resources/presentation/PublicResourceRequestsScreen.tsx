import { colors as appColors } from "../../../core/ui/theme";
import { Text } from "../../../core/ui/AppText";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { PublicRequestCardSkeleton, SkeletonList } from "../../../core/components/Skeleton";
import { fetchMyPublicResourceOffers, fetchPublicResourceRequests } from "../data/resourcesApi";
import type { PublicResourceOffer, PublicResourceRequest } from "../resources";

function toLabel(value: string) {
  return value.replace("_", " ");
}

export default function PublicResourceRequestsScreen() {
  const { publicResourceRequests: cachedRequests, setPublicResourceRequests } = useDataStore();
  const [requests, setRequests] = useState<PublicResourceRequest[]>(cachedRequests || []);
  const [myOffers, setMyOffers] = useState<PublicResourceOffer[]>([]);
  const [isLoading, setIsLoading] = useState(!cachedRequests);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const user = useSessionStore((state) => state.user);

  const loadRequests = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else if (!cachedRequests && requests.length === 0) setIsLoading(true);
    setErrorMessage("");

    try {
      const [requestsResponse, offersResponse] = await Promise.all([
        fetchPublicResourceRequests({ page: 1 }),
        fetchMyPublicResourceOffers(),
      ]);
      setRequests(requestsResponse.results);
      setPublicResourceRequests(requestsResponse.results);
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
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="send-outline" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.offerButtonText}>Send offer</Text>
              </View>
            </Pressable>
          )
        ) : null}
      </View>
    );
  }, [myOffers, user?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Request Resources</Text>
          <Text style={styles.subtitle}>See what LGU students are looking for.</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push("/resources/wanted/create")}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons name="plus" size={14} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.addButtonText}>Request</Text>
          </View>
        </Pressable>
      </View>

      {isLoading ? (
        <SkeletonList count={4} renderItem={() => <PublicRequestCardSkeleton />} />
      ) : (
        <>
          {errorMessage ? (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#b91c1c" style={{ marginRight: 4 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

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
        ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color={appColors.primary} style={{ marginVertical: 12 }} /> : null}
        renderItem={renderItem}
      />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: appColors.background, flex: 1, padding: 20, paddingTop: 56, paddingBottom: 20 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { color: appColors.text, fontSize: 26, fontWeight: "700" },
  subtitle: { color: appColors.textSecondary, marginTop: 4 },
  addButton: { backgroundColor: appColors.primary, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 },
  addButtonText: { color: "#ffffff", fontWeight: "700" },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#ffffff", borderColor: appColors.border, borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 12, padding: 16 },
  cardTitle: { color: appColors.text, fontSize: 17, fontWeight: "700" },
  exchange: { color: appColors.primary, fontWeight: "700", textTransform: "capitalize" },
  description: { color: appColors.textSecondary, lineHeight: 20 },
  meta: { color: appColors.textSecondary, textTransform: "capitalize" },
  ownRequest: { color: appColors.textSecondary, fontWeight: "700" },
  offerSent: { color: appColors.primary, fontWeight: "700", textTransform: "capitalize" },
  offerButton: { alignSelf: "flex-start", backgroundColor: appColors.primary, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 },
  offerButtonText: { color: "#ffffff", fontWeight: "700" },
  emptyText: { color: appColors.textSecondary, textAlign: "center" },
  errorText: { color: "#b91c1c", marginBottom: 12 },
});

