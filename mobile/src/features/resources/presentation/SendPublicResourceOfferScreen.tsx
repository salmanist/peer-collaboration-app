import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { createPublicResourceOffer } from "../data/resourcesApi";

export default function SendPublicResourceOfferScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  const sendOffer = async () => {
    if (!Number.isInteger(requestId)) {
      setErrorMessage("This resource request link is invalid.");
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await createPublicResourceOffer(requestId, message.trim());
      router.replace("/resources");
    } catch {
      setErrorMessage("Could not send your offer. You may already have offered help for this request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset + 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>Fulfill Request</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Send an Offer to Student</Text>
          <Text style={styles.subtitle}>
            Tell the requester how you can help or provide this item. When they accept, a direct chat will open between you.
          </Text>
        </View>

        <Text style={styles.label}>Your Note / Offer Message (optional)</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
          placeholder="For example: I have this textbook from last semester in great condition. I'm on campus every Tuesday and Thursday."
          placeholderTextColor="#94a3b8"
        />

        {errorMessage ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 4 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.sendButton, isSubmitting && styles.sendButtonDisabled]}
          onPress={() => void sendOffer()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="send-outline" size={15} color="#000000" style={{ marginRight: 5 }} />
              <Text style={styles.sendText}>Send Offer to Requester</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  topNavBar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A5D6A7",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#070D1F",
  },
  container: {
    padding: 16,
    gap: 12,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    color: "#070D1F",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  label: {
    color: "#070D1F",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    color: "#070D1F",
    fontSize: 13,
  },
  messageInput: {
    minHeight: 120,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: "#FDBF1E",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 48,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 14,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
});
