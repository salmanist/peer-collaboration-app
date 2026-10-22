import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import { FelloLogo } from "../../../core/components/FelloLogo";
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
            paddingTop: topOffset + 24,
            paddingBottom: Math.max(insets.bottom + 24, 36),
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
          <Text style={styles.brandSub}>Lahore Garrison University</Text>
        </View>

        {/* Full-Screen Form Container (No floating dialog box) */}
        <View style={styles.formContainer}>
          {error ? (
            <View style={styles.errorBannerRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.errorBanner}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="e.g. zahra@lgu.edu.pk"
            placeholderTextColor={appColors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            placeholder="Enter password"
            placeholderTextColor={appColors.textMuted}
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
              <View style={styles.loginButtonContent}>
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
    backgroundColor: "#ffffff", // Pure white full-screen background
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
    justifyContent: "center",
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
  brandSub: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.icon,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  formContainer: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  formHeading: {
    fontSize: 22,
    fontWeight: "900",
    color: appColors.text,
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  formDesc: {
    fontSize: 13,
    color: appColors.textSecondary,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 18,
  },
  errorBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorBanner: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: appColors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: appColors.background,
    borderColor: appColors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: appColors.text,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginTop: 10,
    marginBottom: 20,
  },
  forgotLinkText: {
    color: appColors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  loginButton: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#FDBF1E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 2,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loginButtonText: {
    color: "#000000",
    fontWeight: "900",
    fontSize: 16,
  },
  registerLink: {
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 4,
  },
  registerLinkText: {
    color: appColors.textSecondary,
    fontSize: 14,
  },
  registerLinkBold: {
    color: appColors.primary,
    fontWeight: "800",
  },
});
