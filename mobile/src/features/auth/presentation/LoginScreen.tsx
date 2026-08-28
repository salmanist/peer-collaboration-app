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

import { useSessionStore } from "../../../core/auth/session";
import { login } from "../data/authApi";

function getLoginErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "Something went wrong. Please try again.";
  }

  if (!error.response) {
    return "Cannot reach the server. Confirm backend is running.";
  }

  const detail = error.response.data?.detail;
  if (typeof detail === "string") {
    return detail;
  }

  return "Login failed. Check your email and password.";
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const setSession = useSessionStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await login(email.trim().toLowerCase(), password);
      await setSession({ access: data.access, refresh: data.refresh }, data.user);
      router.replace("/(app)" as any);
    } catch (error) {
      setError(getLoginErrorMessage(error));
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
      >
        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <Text style={styles.brandTitle}>
            LGU <Text style={styles.brandGold}>FellOo</Text>
          </Text>
          <Text style={styles.brandSub}>Lahore Garrison University Student Portal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Log in to Your Account</Text>
          <Text style={styles.cardDesc}>
            Enter your official university credentials to continue.
          </Text>

          {error ? (
            <View style={styles.errorBannerRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorBanner}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>LGU Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. zahra@lgu.edu.pk"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Forgot Password Link */}
          <View style={styles.forgotRow}>
            <Pressable onPress={() => router.push("/(auth)/forgot-password" as any)}>
              <Text style={styles.forgotLinkText}>Forgot password?</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Text style={styles.loginButtonText}>Log In</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#000000" />
              </View>
            )}
          </Pressable>

          <Pressable
            style={styles.registerLink}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.registerLinkText}>
              Don't have an account? <Text style={styles.registerLinkBold}>Register</Text>
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
    color: "#FDBF1E",
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
  forgotRow: {
    alignItems: "flex-end",
    marginTop: 8,
    marginBottom: 16,
  },
  forgotLinkText: {
    color: "#0D3E02",
    fontSize: 13,
    fontWeight: "700",
  },
  loginButton: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 15,
  },
  registerLink: {
    alignItems: "center",
    marginTop: 20,
  },
  registerLinkText: {
    color: "#64748b",
    fontSize: 13,
  },
  registerLinkBold: {
    color: "#0D3E02",
    fontWeight: "700",
  },
});
