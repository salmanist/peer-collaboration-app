import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import { FelloLogo } from "../../../core/components/FelloLogo";
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <FelloLogo size={42} />
            <Text style={styles.brandTitle}>Fello</Text>
          </View>
          <Text style={styles.brandSub}>Lahore Garrison University Student Portal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Verify Your Account</Text>
          <Text style={styles.cardDesc}>
            Enter the 6-digit confirmation code sent to your registered LGU account.
          </Text>

          {phone ? (
            <View style={styles.smsNotice}>
              <MaterialCommunityIcons name="cellphone-message" size={20} color={appColors.primary} />
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

          <TextInput
            style={styles.input}
            placeholder="LGU Email (you@lgu.edu.pk)"
            placeholderTextColor={appColors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.input, styles.codeInput, { marginTop: 12 }]}
            placeholder="6-Digit Confirmation Code"
            placeholderTextColor={appColors.textMuted}
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
              <MaterialCommunityIcons name="arrow-left" size={16} color={appColors.primary} style={{ marginRight: 4 }} />
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
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
  },
  brandBox: {
    alignItems: "center",
    marginBottom: 28,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: appColors.primary,
    letterSpacing: -0.5,
  },
  brandGold: {
    color: appColors.primary,
  },
  brandSub: {
    fontSize: 14,
    color: appColors.icon,
    marginTop: 4,
    fontWeight: "700",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "transparent",
    alignSelf: "center",
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 4,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 13,
    color: appColors.textSecondary,
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 18,
  },
  smsNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
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
    color: appColors.primary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
    fontWeight: "600",
  },
  boldText: {
    fontWeight: "800",
    color: appColors.primary,
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
    color: appColors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: appColors.background,
    borderColor: appColors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: appColors.text,
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
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
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
    color: appColors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
});
