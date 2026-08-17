import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
  const [errorMessage, setErrorMessage] = useState("");
  const user = useSessionStore((state) => state.user);

  useEffect(() => {
    async function loadRequests() {
      try {
        const [requestsResponse, offersResponse] = await Promise.all([
          fetchPublicResourceRequests(),
          fetchMyPublicResourceOffers(),
        ]);
        setRequests(requestsResponse.results);
        setMyOffers(offersResponse.results);
      } catch {
        setErrorMessage("Could not load resource requests.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadRequests();
  }, []);

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1d4ed8" /></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Request Resources</Text>
          <Text style={styles.subtitle}>See what LGU students are looking for.</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push("/resources/wanted/create")}><Text style={styles.addButtonText}>Request</Text></Pressable>
      </View>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {requests.length === 0 ? <Text style={styles.emptyText}>No open resource requests yet.</Text> : null}
      {requests.map((request) => (
        <View key={request.id} style={styles.card}>
          <Text style={styles.cardTitle}>{request.title}</Text>
          <Text style={styles.exchange}>Looking to {toLabel(request.desired_exchange_type)}</Text>
          <Text style={styles.description}>{request.description}</Text>
          <Text style={styles.meta}>{toLabel(request.category)} · Requested by {request.requester_name}</Text>
          {request.requester_id === user?.id ? <Text style={styles.ownRequest}>Your request</Text> : null}
          {request.requester_id !== user?.id ? (
            myOffers.some((offer) => offer.public_request_id === request.id) ? (
              <Text style={styles.offerSent}>Offer sent: {myOffers.find((offer) => offer.public_request_id === request.id)?.status}</Text>
            ) : (
              <Pressable style={styles.offerButton} onPress={() => router.push(`/resources/wanted/offer/${request.id}`)}>
                <Text style={styles.offerButtonText}>Send offer</Text>
              </Pressable>
            )
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flexGrow: 1, padding: 20, paddingTop: 56, paddingBottom: 36 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { color: "#0f172a", fontSize: 26, fontWeight: "700" }, subtitle: { color: "#64748b", marginTop: 4 },
  addButton: { backgroundColor: "#1d4ed8", borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 }, addButtonText: { color: "#ffffff", fontWeight: "700" },
  card: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 12, padding: 16 },
  cardTitle: { color: "#0f172a", fontSize: 17, fontWeight: "700" }, exchange: { color: "#1d4ed8", fontWeight: "700", textTransform: "capitalize" },
  description: { color: "#475569", lineHeight: 20 }, meta: { color: "#64748b", textTransform: "capitalize" },
  ownRequest: { color: "#64748b", fontWeight: "700" }, offerSent: { color: "#047857", fontWeight: "700", textTransform: "capitalize" }, offerButton: { alignSelf: "flex-start", backgroundColor: "#047857", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 }, offerButtonText: { color: "#ffffff", fontWeight: "700" },
  emptyText: { color: "#64748b", textAlign: "center", marginTop: 80 }, errorText: { color: "#b91c1c", marginBottom: 12 },
});
