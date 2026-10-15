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

import { forgotPassword, resetPassword } from "../data/authApi";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"request" | "reset" | "success">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneInfo, setPhoneInfo] = useState("");
  const [debugOtp, setDebugOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your registered LGU email address.");
      return;
    }
    if (!cleanEmail.endsWith("@lgu.edu.pk")) {
      setError("Please enter a valid @lgu.edu.pk email.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const data = await forgotPassword(cleanEmail);
      if (data.phone_number) setPhoneInfo(data.phone_number);
      if (data.debug_otp) setDebugOtp(data.debug_otp);
      setStep("reset");
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(detail || "Failed to send reset code. Please check your email.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        code: cleanCode,
        new_password: newPassword,
      });
      setStep("success");
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(detail || "Failed to reset password. Check your code.");
      } else {
        setError("Could not reset password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Top Header */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => router.replace("/(auth)/login" as any)}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>Reset Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <Text style={styles.brandTitle}>FellOo</Text>
          <Text style={styles.brandSub}>Lahore Garrison University Student Portal</Text>
        </View>

        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#FECACA", marginBottom: 14, gap: 8 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" />
            <Text style={{ color: "#B91C1C", fontSize: 13, flex: 1, fontWeight: "600" }}>{error}</Text>
          </View>
        ) : null}

        {step === "request" && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Forgot Password?</Text>
            <Text style={styles.cardDesc}>
              Enter your official LGU student email. We will send a 6-digit verification code to your registered mobile number and email.
            </Text>

            <Text style={styles.fieldLabel}>LGU Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. zahra@lgu.edu.pk"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Pressable
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={() => void handleRequestOtp()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <Text style={styles.submitButtonText}>Send Reset Code</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#000000" style={{ marginLeft: 6 }} />
                </View>
              )}
            </Pressable>
          </View>
        )}

        {step === "reset" && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Enter Verification Code</Text>
            <Text style={styles.cardDesc}>
              We sent a 6-digit reset code to your registered email and mobile number {phoneInfo ? `(${phoneInfo})` : ""}.
            </Text>

            {debugOtp ? (
              <View style={styles.debugOtpBox}>
                <MaterialCommunityIcons name="key-variant" size={15} color="#0D3E02" style={{ marginRight: 6 }} />
                <Text style={styles.debugOtpText}>Test Code: <Text style={styles.debugOtpBold}>{debugOtp}</Text></Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>6-Digit OTP Code *</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="123456"
              placeholderTextColor="#94a3b8"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <Text style={styles.fieldLabel}>New Password * (Min 6 characters)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#94a3b8"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Text style={styles.fieldLabel}>Confirm New Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter new password"
              placeholderTextColor="#94a3b8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <Pressable
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={() => void handleResetPassword()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <Text style={styles.submitButtonText}>Reset Password & Log In</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#000000" style={{ marginLeft: 6 }} />
                </View>
              )}
            </Pressable>

            <Pressable
              style={styles.resendBtn}
              onPress={() => void handleRequestOtp()}
              disabled={isSubmitting}
            >
              <Text style={styles.resendText}>Didn't receive code? Resend OTP</Text>
            </Pressable>
          </View>
        )}

        {step === "success" && (
          <View style={styles.card}>
            <View style={{ alignItems: "center" }}>
              <MaterialCommunityIcons name="check-circle" size={54} color="#0D3E02" style={{ marginBottom: 12 }} />
            </View>
            <Text style={styles.cardHeading}>Password Reset Successfully!</Text>
            <Text style={styles.cardDesc}>
              Your account password has been updated. You can now log in with your new password.
            </Text>

            <Pressable
              style={styles.submitButton}
              onPress={() => router.replace("/(auth)/login" as any)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <Text style={styles.submitButtonText}>Go to Log In</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color="#000000" style={{ marginLeft: 6 }} />
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topNavBar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0D3E02",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  brandBox: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 6,
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
    color: "#64748B",
    marginTop: 4,
    fontWeight: "600",
  },
  errorBanner: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#FECACA",
    fontWeight: "600",
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
    color: "#070D1F",
    marginBottom: 6,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 20,
    textAlign: "center",
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
    marginBottom: 6,
  },
  otpInput: {
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
    fontWeight: "800",
    color: "#0D3E02",
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
  },
  debugOtpBox: {
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 8,
    borderColor: "#FDE68A",
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "center",
  },
  debugOtpText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "600",
  },
  debugOtpBold: {
    fontWeight: "800",
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
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
  resendBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  resendText: {
    color: "#0D3E02",
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  successEmoji: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 12,
  },
});
