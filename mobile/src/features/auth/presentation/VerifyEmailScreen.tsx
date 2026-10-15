import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import { verifyEmail } from "../data/authApi";

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyEmail(email.trim().toLowerCase(), code.trim());
      router.replace("/(auth)/login");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll center back="/(auth)/login">
      <View style={styles.header}>
        <Badge label="Check your inbox" tone="tertiary" icon="email-outline" />
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.hint}>Enter the 6-digit code we sent you.</Text>
      </View>

      <Card style={styles.card}>
        <TextField
          label="Email"
          placeholder="you@lgu.edu.pk"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField
          label="Verification code"
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.codeInput}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Verify" onPress={handleSubmit} loading={isSubmitting} style={styles.submit} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginTop: spacing.sm },
  hint: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, textAlign: "center" },
  card: { gap: spacing.md },
  submit: { marginTop: spacing.xs },
  codeInput: { fontSize: typography.size.lg, letterSpacing: 8, fontFamily: font.familyMedium, textAlign: "center" },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
});
