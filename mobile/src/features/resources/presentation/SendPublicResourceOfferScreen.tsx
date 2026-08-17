import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";

import { createPublicResourceOffer } from "../data/resourcesApi";

export default function SendPublicResourceOfferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const sendOffer = async () => {
    if (!Number.isInteger(requestId)) {
      setErrorMessage("This resource request link is invalid.");
      return;
    }
    setErrorMessage(""); setIsSubmitting(true);
    try {
      await createPublicResourceOffer(requestId, message.trim());
      router.replace("/resources/wanted");
    } catch {
      setErrorMessage("Could not send your offer. You may already have offered help for this request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()}><Text style={styles.backLink}>← Back to requests</Text></Pressable>
      <Text style={styles.title}>Send an offer</Text>
      <Text style={styles.subtitle}>Tell the requester what you can provide. They can accept or decline your offer.</Text>
      <Text style={styles.label}>Message (optional)</Text>
      <TextInput
        style={[styles.input, styles.messageInput]}
        value={message}
        onChangeText={setMessage}
        multiline
        textAlignVertical="top"
        maxLength={500}
        placeholder="For example: I have this book and can lend it to you this week."
      />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <Pressable style={styles.sendButton} onPress={() => void sendOffer()} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.sendText}>Send offer</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flexGrow: 1, gap: 10, padding: 20, paddingTop: 56, paddingBottom: 36 },
  backLink: { color: "#1d4ed8", fontWeight: "700", marginBottom: 10 }, title: { color: "#0f172a", fontSize: 26, fontWeight: "700" }, subtitle: { color: "#64748b", lineHeight: 20, marginBottom: 8 }, label: { color: "#334155", fontWeight: "700", marginTop: 6 },
  input: { backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: 8, borderWidth: 1, padding: 12 }, messageInput: { minHeight: 130 }, sendButton: { alignItems: "center", backgroundColor: "#047857", borderRadius: 8, justifyContent: "center", marginTop: 16, minHeight: 48 }, sendText: { color: "#ffffff", fontWeight: "700" }, errorText: { color: "#b91c1c", marginTop: 6 },
});
