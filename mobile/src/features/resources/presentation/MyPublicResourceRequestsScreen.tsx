import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { deletePublicResourceRequest, fetchIncomingPublicResourceOffers, fetchMyPublicResourceOffers, fetchMyPublicResourceRequests, updatePublicResourceOfferStatus, updatePublicResourceRequestStatus } from "../data/resourcesApi";
import type { PublicResourceOffer, PublicResourceOfferStatus, PublicResourceRequest, PublicResourceRequestStatus } from "../resources";

type RequestTab = "requests" | "received" | "sent";

export default function MyPublicResourceRequestsScreen() {
  const [requests, setRequests] = useState<PublicResourceRequest[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<PublicResourceOffer[]>([]);
  const [sentOffers, setSentOffers] = useState<PublicResourceOffer[]>([]);
  const [activeTab, setActiveTab] = useState<RequestTab>("requests");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRequests = async () => {
    try {
      const [requestsResponse, incomingOffersResponse, sentOffersResponse] = await Promise.all([
        fetchMyPublicResourceRequests(),
        fetchIncomingPublicResourceOffers(),
        fetchMyPublicResourceOffers(),
      ]);
      setRequests(requestsResponse.results);
      setIncomingOffers(incomingOffersResponse.results);
      setSentOffers(sentOffersResponse.results);
    }
    catch { setErrorMessage("Could not load your requests."); }
    finally { setIsLoading(false); }
  };

  const changeOfferStatus = async (id: number, status: PublicResourceOfferStatus) => {
    try { await updatePublicResourceOfferStatus(id, status); await loadRequests(); }
    catch { setErrorMessage("Could not update this offer."); }
  };
  useEffect(() => { void loadRequests(); }, []);

  const changeStatus = async (id: number, status: PublicResourceRequestStatus) => {
    try { await updatePublicResourceRequestStatus(id, status); await loadRequests(); }
    catch { setErrorMessage("Could not update this request."); }
  };

  const deleteRequest = (request: PublicResourceRequest) => {
    Alert.alert(
      "Delete request?",
      `Delete “${request.title}”? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deletePublicResourceRequest(request.id);
                await loadRequests();
              } catch {
                setErrorMessage("Could not delete this request.");
              }
            })();
          },
        },
      ],
    );
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1d4ed8" /></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}><Text style={styles.backLink}>← My Resources</Text></Pressable>
      <View style={styles.header}>
        <Text style={styles.title}>My Requests</Text>
        <Pressable style={styles.addButton} onPress={() => router.push("/resources/wanted/create")}><Text style={styles.addButtonText}>Request resource</Text></Pressable>
      </View>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <View style={styles.tabs}>
        <TabButton label="My requests" active={activeTab === "requests"} onPress={() => setActiveTab("requests")} />
        <TabButton label="Received" active={activeTab === "received"} onPress={() => setActiveTab("received")} />
        <TabButton label="Sent" active={activeTab === "sent"} onPress={() => setActiveTab("sent")} />
      </View>

      {activeTab === "received" ? <>
        {incomingOffers.length === 0 ? <Text style={styles.emptyText}>No one has offered a resource yet.</Text> : null}
        {incomingOffers.map((offer) => (
          <View key={offer.id} style={styles.offerCard}>
            <Text style={styles.cardTitle}>{offer.public_request_title}</Text>
            <Text style={styles.description}>From: {offer.offerer_name}</Text>
            {offer.message ? <Text style={styles.description}>“{offer.message}”</Text> : null}
            <Text style={styles.status}>Status: {offer.status}</Text>
            {offer.status === "pending" ? <View style={styles.actions}>
              <Pressable style={styles.fulfilledButton} onPress={() => void changeOfferStatus(offer.id, "accepted")}><Text style={styles.actionText}>Accept offer</Text></Pressable>
              <Pressable style={styles.cancelButton} onPress={() => void changeOfferStatus(offer.id, "declined")}><Text style={styles.cancelText}>Decline</Text></Pressable>
            </View> : null}
            {offer.status === "accepted" ? <Pressable style={styles.chatButton} onPress={() => router.push({ pathname: "/resources/wanted/chat/[offerId]", params: { offerId: String(offer.id), resourceTitle: offer.public_request_title } })}><Text style={styles.actionText}>Open chat</Text></Pressable> : null}
          </View>
        ))}
      </> : null}

      {activeTab === "sent" ? <>
        {sentOffers.length === 0 ? <Text style={styles.emptyText}>You have not offered a resource yet.</Text> : null}
        {sentOffers.map((offer) => (
          <View key={offer.id} style={styles.sentOfferCard}>
            <Text style={styles.cardTitle}>{offer.public_request_title}</Text>
            {offer.message ? <Text style={styles.description}>“{offer.message}”</Text> : null}
            <Text style={styles.status}>Status: {offer.status}</Text>
            {offer.status === "pending" ? <Pressable style={styles.cancelButton} onPress={() => void changeOfferStatus(offer.id, "cancelled")}><Text style={styles.cancelText}>Cancel offer</Text></Pressable> : null}
            {offer.status === "accepted" ? <Pressable style={styles.chatButton} onPress={() => router.push({ pathname: "/resources/wanted/chat/[offerId]", params: { offerId: String(offer.id), resourceTitle: offer.public_request_title } })}><Text style={styles.actionText}>Open chat</Text></Pressable> : null}
          </View>
        ))}
      </> : null}

      {activeTab === "requests" ? <>
        {requests.length === 0 ? <Text style={styles.emptyText}>You have not requested a resource yet.</Text> : null}
        {requests.map((request) => (
          <View key={request.id} style={styles.card}>
            <Text style={styles.cardTitle}>{request.title}</Text>
            <Text style={styles.status}>Status: {request.status}</Text>
            <Text style={styles.description}>{request.description}</Text>
            <View style={styles.manageActions}>
              {request.status === "open" ? <Pressable style={styles.editButton} onPress={() => router.push(`/resources/wanted/edit/${request.id}`)}><Text style={styles.editText}>Edit</Text></Pressable> : null}
              <Pressable style={styles.deleteButton} onPress={() => deleteRequest(request)}><Text style={styles.deleteText}>Delete</Text></Pressable>
            </View>
            {request.status === "open" ? <View style={styles.actions}>
              <Pressable style={styles.fulfilledButton} onPress={() => void changeStatus(request.id, "fulfilled")}><Text style={styles.actionText}>Mark fulfilled</Text></Pressable>
              <Pressable style={styles.cancelButton} onPress={() => void changeStatus(request.id, "cancelled")}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            </View> : null}
          </View>
        ))}
      </> : null}
    </ScrollView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable style={[styles.tab, active && styles.activeTab]} onPress={onPress}><Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flexGrow: 1, padding: 20, paddingTop: 56 }, centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  backLink: { color: "#1d4ed8", fontWeight: "700", marginBottom: 20 }, header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 }, title: { color: "#0f172a", fontSize: 26, fontWeight: "700" },
  addButton: { backgroundColor: "#1d4ed8", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }, addButtonText: { color: "#ffffff", fontWeight: "700" }, card: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 12, padding: 16 },
  cardTitle: { color: "#0f172a", fontSize: 17, fontWeight: "700" }, status: { color: "#1d4ed8", fontWeight: "700", textTransform: "capitalize" }, description: { color: "#475569" }, manageActions: { flexDirection: "row", gap: 10, marginTop: 4 }, editButton: { backgroundColor: "#dbeafe", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 8 }, editText: { color: "#1d4ed8", fontWeight: "700" }, deleteButton: { borderColor: "#b91c1c", borderRadius: 7, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, deleteText: { color: "#b91c1c", fontWeight: "700" }, actions: { flexDirection: "row", gap: 10, marginTop: 6 }, fulfilledButton: { backgroundColor: "#047857", borderRadius: 7, paddingHorizontal: 10, paddingVertical: 9 }, cancelButton: { borderColor: "#b91c1c", borderRadius: 7, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9 }, actionText: { color: "#ffffff", fontWeight: "700" }, cancelText: { color: "#b91c1c", fontWeight: "700" },
  tabs: { backgroundColor: "#e2e8f0", borderRadius: 9, flexDirection: "row", marginBottom: 16, padding: 3 }, tab: { alignItems: "center", borderRadius: 7, flex: 1, paddingHorizontal: 6, paddingVertical: 9 }, activeTab: { backgroundColor: "#ffffff" }, tabText: { color: "#475569", fontSize: 12, fontWeight: "700" }, activeTabText: { color: "#1d4ed8" }, offerCard: { backgroundColor: "#f0fdf4", borderColor: "#86efac", borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 10, padding: 16 }, sentOfferCard: { backgroundColor: "#eff6ff", borderColor: "#93c5fd", borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 10, padding: 16 }, chatButton: { alignSelf: "flex-start", backgroundColor: "#7c3aed", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 }, emptyText: { color: "#64748b", textAlign: "center", marginTop: 50 }, errorText: { color: "#b91c1c", marginBottom: 12 },
});
