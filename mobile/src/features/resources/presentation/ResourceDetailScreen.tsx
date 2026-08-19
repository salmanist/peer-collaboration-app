import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import { API_BASE_URL } from "../../../core/network/apiClient";
import { createResourceInterestRequest, fetchResourceListing } from "../data/resourcesApi";
import type { ResourceListing } from "../resources";

function getImageUrl(imagePath: string | null) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const host = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${host}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

function getExchangeLabel(resource: ResourceListing) {
  if (resource.exchange_type === "sell" && resource.price) {
    return `Rs. ${resource.price}`;
  }

  return resource.exchange_type.replace("_", " ");
}

function toLabel(value: string) {
  return value.replace("_", " ");
}


export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resourceId = Number(id);
  const currentUser = useSessionStore((state) => state.user);
  const [resource, setResource] = useState<ResourceListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [interestMessage, setInterestMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  useEffect(() => {
    async function loadResource() {
      if (!Number.isInteger(resourceId)) {
        setErrorMessage("This resource link is invalid.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetchResourceListing(resourceId);
        setResource(response);
      } catch {
        setErrorMessage("Could not load this resource.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadResource();
  }, [resourceId]);

  const handleInterestRequest = async () => {
    setRequestMessage("");
    setIsSendingRequest(true);

    try {
      await createResourceInterestRequest(resourceId, interestMessage.trim());
      setRequestMessage("Your interest request has been sent.");
      setInterestMessage("");
    } catch {
      setRequestMessage("Could not send the request. You may have already requested this resource.");
    } finally {
      setIsSendingRequest(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (errorMessage || !resource) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMessage || "Resource not found."}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.backLink}>← Back to resources</Text>
      </Pressable>

      {resource.image ? (
        <Image
          source={{ uri: getImageUrl(resource.image)! }}
          style={styles.bannerImage}
        />
      ) : null}

      <Text style={styles.title}>{resource.title}</Text>
      <Text style={styles.exchangeType}>{getExchangeLabel(resource)}</Text>



      <View style={styles.infoBox}>
        <Text style={styles.label}>Category</Text>
        <Text style={styles.value}>{toLabel(resource.category)}</Text>

        <Text style={styles.label}>Condition</Text>
        <Text style={styles.value}>{resource.condition}</Text>

        {resource.course ? (
          <>
            <Text style={styles.label}>Course</Text>
            <Text style={styles.value}>{resource.course}</Text>
          </>
        ) : null}

        <Text style={styles.label}>Posted by</Text>
        <Text style={styles.value}>{resource.owner_name}</Text>
      </View>

      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.description}>{resource.description}</Text>

      {currentUser?.id === resource.owner_id ? (
        <Text style={styles.ownerNotice}>This is your resource listing.</Text>
      ) : (
        <View style={styles.requestSection}>
          <Text style={styles.sectionTitle}>Interested?</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Optional message for the owner"
            value={interestMessage}
            onChangeText={setInterestMessage}
            multiline
          />
          {requestMessage ? <Text style={styles.requestMessage}>{requestMessage}</Text> : null}
          <Pressable style={styles.interestButton} onPress={() => void handleInterestRequest()} disabled={isSendingRequest}>
            {isSendingRequest ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.interestButtonText}>Send interest request</Text>}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#f8fafc", padding: 20, paddingTop: 56 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  backLink: { color: "#1d4ed8", fontWeight: "700", marginBottom: 20 },
  title: { color: "#0f172a", fontSize: 28, fontWeight: "700" },
  exchangeType: { color: "#1d4ed8", fontSize: 17, fontWeight: "700", textTransform: "capitalize", marginTop: 8 },
  infoBox: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 12, borderWidth: 1, gap: 4, marginTop: 24, padding: 16 },
  label: { color: "#64748b", fontSize: 13, marginTop: 8 },
  value: { color: "#0f172a", fontSize: 16, textTransform: "capitalize" },
  sectionTitle: { color: "#0f172a", fontSize: 18, fontWeight: "700", marginTop: 24 },
  description: { color: "#475569", fontSize: 16, lineHeight: 24, marginTop: 8 },
  requestSection: { marginTop: 24 },
  messageInput: { backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: 8, borderWidth: 1, minHeight: 90, marginTop: 8, padding: 12, textAlignVertical: "top" },
  requestMessage: { color: "#047857", marginTop: 10 },
  interestButton: { alignItems: "center", backgroundColor: "#1d4ed8", borderRadius: 8, marginTop: 32, padding: 14 },
  interestButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  ownerNotice: { color: "#64748b", fontStyle: "italic", marginTop: 28 },
  errorText: { color: "#b91c1c", textAlign: "center" },
  bannerImage: { width: "100%", height: 220, borderRadius: 12, marginBottom: 16, resizeMode: "cover" },
});

