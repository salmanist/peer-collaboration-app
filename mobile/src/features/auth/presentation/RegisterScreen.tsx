import axios from "axios";
import { router } from "expo-router";
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

import { register } from "../data/authApi";

function getRegisterErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  if (!error.response) {
    return "Cannot reach the server. Confirm backend is running.";
  }

  const detail = error.response.data;
  if (typeof detail === "string") {
    return detail;
  }
  if (typeof detail === "object" && detail !== null) {
    return Object.values(detail).flat().join(" ");
  }

  return "Registration failed. Please check your email and password.";
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  const handleSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please provide both your LGU email and password.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await register({
        email: cleanEmail,
        password,
      });

      router.push({
        pathname: "/(auth)/verify-email",
        params: {
          email: cleanEmail,
          phone: res?.phone_number ?? "",
        },
      });
    } catch (err: unknown) {
      setError(getRegisterErrorMessage(err));
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
          <Text style={styles.cardHeading}>Create Your Account</Text>
          <Text style={styles.cardDesc}>
            Enter your official university email and choose a password to get started.
          </Text>

          {error ? (
            <View style={styles.errorBannerRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorBanner}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>LGU Student Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@lgu.edu.pk"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={styles.fieldHint}>Must end with @lgu.edu.pk</Text>

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.submitBtnText}>Create Account</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchAuthBtn}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.switchAuthText}>
              Already have an account? <Text style={styles.switchAuthHighlight}>Log In</Text>
            </Text>
          </Pressable>
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
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  brandBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: 0.5,
  },
  brandGold: {
    color: "#0D3E02",
  },
  brandSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
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
  },
  errorBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorBanner: {
    color: "#B91C1C",
    fontSize: 13,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#070D1F",
    marginTop: 10,
    marginBottom: 6,
  },
  fieldHint: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4,
    marginBottom: 4,
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
  submitBtn: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "800",
  },
  switchAuthBtn: {
    marginTop: 20,
    alignItems: "center",
  },
  switchAuthText: {
    color: "#64748b",
    fontSize: 13,
  },
  switchAuthHighlight: {
    color: "#0D3E02",
    fontWeight: "700",
  },
});
