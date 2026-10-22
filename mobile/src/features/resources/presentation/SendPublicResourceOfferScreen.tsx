import { colors as appColors } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
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

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

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
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => goBack("/(app)/resources")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
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
          placeholderTextColor={appColors.textMuted}
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
    backgroundColor: appColors.background,
  },
  topNavBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: appColors.primary,
  },
  container: {
    padding: 16,
    gap: 12,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    color: appColors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: appColors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  label: {
    color: appColors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: appColors.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    color: appColors.text,
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
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
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
