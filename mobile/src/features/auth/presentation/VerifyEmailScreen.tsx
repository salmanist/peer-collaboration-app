import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

import { verifyEmail } from "../data/authApi";

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string; phone?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phone = params.phone ?? "";
  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyEmail(email.trim().toLowerCase(), code.trim());
      router.replace("/(auth)/login");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Verification failed. Please check the code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topOffset + 30,
            paddingBottom: Math.max(insets.bottom + 30, 40),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <Text style={styles.brandTitle}>FellOo</Text>
          <Text style={styles.brandSub}>Lahore Garrison University Student Portal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Verify Your Account</Text>
          <Text style={styles.cardDesc}>
            Enter the 6-digit confirmation code sent to your registered LGU account.
          </Text>

          {phone ? (
            <View style={styles.smsNotice}>
              <MaterialCommunityIcons name="cellphone-message" size={20} color="#0D3E02" />
              <Text style={styles.smsNoticeText}>
                Confirmation code sent via SMS to <Text style={styles.boldText}>{phone}</Text> and your LGU email.
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#FECACA", marginBottom: 14, gap: 8 }}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={{ color: "#B91C1C", fontSize: 13, flex: 1, fontWeight: "600" }}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>LGU Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@lgu.edu.pk"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.fieldLabel}>6-Digit Confirmation Code</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="e.g. 123456"
            placeholderTextColor="#94a3b8"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <Pressable
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.submitButtonText}>Confirm & Activate Account</Text>
            )}
          </Pressable>

          <View style={styles.backLinkWrap}>
            <Pressable
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}
              onPress={() => router.replace("/(auth)/login" as any)}
            >
              <MaterialCommunityIcons name="arrow-left" size={16} color="#0D3E02" style={{ marginRight: 4 }} />
              <Text style={styles.backLinkText}>Back to Log In</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  brandBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.5,
  },
  brandGold: {
    color: "#0D3E02",
  },
  brandSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderColor: "#E2E8F0",
    borderWidth: 1,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#070D1F",
    marginBottom: 4,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 18,
  },
  smsNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
    borderColor: "#FDBF1E",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  smsNoticeIcon: {
    fontSize: 16,
  },
  smsNoticeText: {
    color: "#0D3E02",
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
    fontWeight: "600",
  },
  boldText: {
    fontWeight: "800",
    color: "#0D3E02",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#070D1F",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#070D1F",
  },
  codeInput: {
    letterSpacing: 4,
    fontWeight: "700",
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 15,
  },
  backLinkWrap: {
    alignItems: "center",
    marginTop: 16,
  },
  backLinkText: {
    color: "#0D3E02",
    fontSize: 13,
    fontWeight: "700",
  },
});
