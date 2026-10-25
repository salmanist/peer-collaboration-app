import { colors as appColors, headerGrow } from "../../../core/ui/theme";
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

import { forgotPassword, resetPassword } from "../data/authApi";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"request" | "reset" | "success">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <FelloLogo size={42} />
            <Text style={styles.brandTitle}>Fello</Text>
          </View>
          <Text style={styles.brandSub}>Lahore Garrison University Student Portal</Text>
        </View>

        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: appColors.red50, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: appColors.red200, marginBottom: 14, gap: 8 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.red700} />
            <Text style={{ color: appColors.red700, fontSize: 13, flex: 1, fontWeight: "600" }}>{error}</Text>
          </View>
        ) : null}

        {step === "request" && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Forgot Password?</Text>
            <Text style={styles.cardDesc}>
              Enter your official LGU student email. We will send a 6-digit verification code to your registered mobile number and email.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="LGU Email Address (e.g. zahra@lgu.edu.pk)"
              placeholderTextColor={appColors.textMuted}
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
                <ActivityIndicator color={appColors.black} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Send Reset Code</Text>
              )}
            </Pressable>
          </View>
        )}

        {step === "reset" && (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Enter Verification Code</Text>
            <Text style={styles.cardDesc}>
              We sent a 6-digit reset code to {email.trim().toLowerCase()}. Open your university inbox, copy the code and enter it below. It expires in 15 minutes.
            </Text>

            {debugOtp ? (
              <View style={styles.debugOtpBox}>
                <MaterialCommunityIcons name="key-variant" size={15} color={appColors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.debugOtpText}>Test Code: <Text style={styles.debugOtpBold}>{debugOtp}</Text></Text>
              </View>
            ) : null}

            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="Enter 6-Digit OTP Code"
              placeholderTextColor={appColors.textMuted}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder="New Password (min 6 characters)"
              placeholderTextColor={appColors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder="Confirm New Password"
              placeholderTextColor={appColors.textMuted}
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
                <ActivityIndicator color={appColors.black} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Reset Password & Log In</Text>
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
              <MaterialCommunityIcons name="check-circle" size={54} color={appColors.primary} style={{ marginBottom: 12 }} />
            </View>
            <Text style={styles.cardHeading}>Password Reset Successfully!</Text>
            <Pressable
              style={styles.submitButton}
              onPress={() => router.replace("/(auth)/login" as any)}
            >
              <Text style={styles.submitButtonText}>Go to Log In</Text>
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
    backgroundColor: appColors.white,
  },
  topNavBar: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    backgroundColor: appColors.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 8 + headerGrow,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appColors.headerControlBg,
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: appColors.onHeader,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: appColors.white,
  },
  brandBox: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 6,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: appColors.primary,
    letterSpacing: -0.5,
  },
  brandGold: {
    color: appColors.primary,
  },
  brandSub: {
    fontSize: 13,
    color: appColors.textSecondary,
    marginTop: 4,
    fontWeight: "600",
  },
  errorBanner: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: appColors.dangerBg,
    color: appColors.red700,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 13,
    borderWidth: 1,
    borderColor: appColors.red200,
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
    color: appColors.text,
    marginBottom: 6,
    textAlign: "center",
  },
  cardDesc: {
    fontSize: 13,
    color: appColors.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: "center",
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
    marginBottom: 6,
  },
  otpInput: {
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
    fontWeight: "800",
    color: appColors.primary,
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.border,
  },
  debugOtpBox: {
    backgroundColor: appColors.surfaceMuted,
    padding: 10,
    borderRadius: 8,
    borderColor: appColors.amber200,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "center",
  },
  debugOtpText: {
    color: appColors.icon,
    fontSize: 13,
    fontWeight: "600",
  },
  debugOtpBold: {
    fontWeight: "800",
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: appColors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
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
    color: appColors.black,
    fontWeight: "800",
    fontSize: 15,
  },
  resendBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  resendText: {
    color: appColors.primary,
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
