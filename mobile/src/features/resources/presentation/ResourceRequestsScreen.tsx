import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  fetchIncomingResourceInterestRequests,
  fetchMyResourceInterestRequests,
  updateResourceInterestRequestStatus,
} from "../data/resourcesApi";
import type { ResourceInterestRequest, ResourceInterestRequestStatus } from "../resources";
import { useSessionStore } from "../../../core/auth/session";
import { useResourceNotificationStore } from "../resourceNotifications";

function labelStatus(status: ResourceInterestRequestStatus) {
  return status[0].toUpperCase() + status.slice(1);
}

export default function ResourceRequestsScreen() {
  const [incomingRequests, setIncomingRequests] = useState<ResourceInterestRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ResourceInterestRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const user = useSessionStore((state) => state.user);
  const markInterestRequestsRead = useResourceNotificationStore((state) => state.markInterestRequestsRead);

  const loadRequests = async () => {
    setErrorMessage("");
    try {
      const [incoming, sent] = await Promise.all([
        fetchIncomingResourceInterestRequests(),
        fetchMyResourceInterestRequests(),
      ]);
      setIncomingRequests(incoming.results);
      setSentRequests(sent.results);
      if (user) void markInterestRequestsRead(user.id);
    } catch {
      setErrorMessage("Could not load requests. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [user, markInterestRequestsRead]);

  const updateRequest = async (requestId: number, status: ResourceInterestRequestStatus) => {
    try {
      await updateResourceInterestRequestStatus(requestId, status);
      await loadRequests();
    } catch {
      setErrorMessage("Could not update this request.");
    }
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1d4ed8" /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}><Text style={styles.backLink}>← Back to resources</Text></Pressable>
      <Text style={styles.title}>Resource requests</Text>
      <Text style={styles.subtitle}>Manage requests you received and sent.</Text>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Text style={styles.sectionTitle}>Incoming requests</Text>
      {incomingRequests.length === 0 ? <Text style={styles.emptyText}>No one has requested your resources yet.</Text> : null}
      {incomingRequests.map((interestRequest) => (
        <RequestCard key={interestRequest.id} interestRequest={interestRequest} kind="incoming" onUpdate={updateRequest} />
      ))}

      <Text style={styles.sectionTitle}>Requests you sent</Text>
      {sentRequests.length === 0 ? <Text style={styles.emptyText}>You have not requested any resources yet.</Text> : null}
      {sentRequests.map((interestRequest) => (
        <RequestCard key={interestRequest.id} interestRequest={interestRequest} kind="sent" onUpdate={updateRequest} />
      ))}
    </ScrollView>
  );
}

function RequestCard({
  interestRequest,
  kind,
  onUpdate,
}: {
  interestRequest: ResourceInterestRequest;
  kind: "incoming" | "sent";
  onUpdate: (requestId: number, status: ResourceInterestRequestStatus) => Promise<void>;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{interestRequest.resource_title}</Text>
      {kind === "incoming" ? <Text style={styles.cardText}>From: {interestRequest.requester_name}</Text> : null}
      {interestRequest.message ? <Text style={styles.cardText}>“{interestRequest.message}”</Text> : null}
      <Text style={styles.status}>Status: {labelStatus(interestRequest.status)}</Text>

      {kind === "incoming" && interestRequest.status === "pending" ? (
        <View style={styles.actions}>
          <Pressable style={styles.acceptButton} onPress={() => void onUpdate(interestRequest.id, "accepted")}><Text style={styles.actionText}>Accept</Text></Pressable>
          <Pressable style={styles.declineButton} onPress={() => void onUpdate(interestRequest.id, "declined")}><Text style={styles.actionText}>Decline</Text></Pressable>
        </View>
      ) : null}

      {kind === "incoming" && interestRequest.status === "accepted" ? (
        <Pressable style={styles.completeButton} onPress={() => void onUpdate(interestRequest.id, "completed")}><Text style={styles.actionText}>Mark completed</Text></Pressable>
      ) : null}

      {kind === "sent" && (interestRequest.status === "pending" || interestRequest.status === "accepted") ? (
        <Pressable style={styles.cancelButton} onPress={() => void onUpdate(interestRequest.id, "cancelled")}><Text style={styles.cancelText}>Cancel request</Text></Pressable>
      ) : null}

      {interestRequest.status === "accepted" ? (
        <Pressable style={styles.chatButton} onPress={() => router.push({ pathname: "/resources/chat/[requestId]", params: { requestId: String(interestRequest.id), resourceTitle: interestRequest.resource_title } })}><Text style={styles.actionText}>Open chat</Text></Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flexGrow: 1, padding: 20, paddingTop: 56, paddingBottom: 36 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  backLink: { color: "#1d4ed8", fontWeight: "700", marginBottom: 20 },
  title: { color: "#0f172a", fontSize: 26, fontWeight: "700" },
  subtitle: { color: "#64748b", marginTop: 4 },
  sectionTitle: { color: "#0f172a", fontSize: 19, fontWeight: "700", marginTop: 28, marginBottom: 10 },
  emptyText: { color: "#64748b" },
  card: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 12, borderWidth: 1, gap: 8, marginTop: 10, padding: 14 },
  cardTitle: { color: "#0f172a", fontSize: 17, fontWeight: "700" },
  cardText: { color: "#475569" },
  status: { color: "#1d4ed8", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8 },
  acceptButton: { backgroundColor: "#047857", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 },
  declineButton: { backgroundColor: "#b91c1c", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 },
  completeButton: { alignSelf: "flex-start", backgroundColor: "#1d4ed8", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 },
  chatButton: { alignSelf: "flex-start", backgroundColor: "#7c3aed", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 },
  cancelButton: { alignSelf: "flex-start", borderColor: "#b91c1c", borderRadius: 7, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  actionText: { color: "#ffffff", fontWeight: "700" },
  cancelText: { color: "#b91c1c", fontWeight: "700" },
  errorText: { color: "#b91c1c", marginTop: 16 },
});
