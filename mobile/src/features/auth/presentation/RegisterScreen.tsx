import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import { register } from "../data/authApi";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ email: email.trim().toLowerCase(), password });
      router.push({ pathname: "/(auth)/verify-email", params: { email: email.trim().toLowerCase() } });
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail === "object" ? Object.values(detail).flat().join(" ") : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll center back="/(auth)/login">
      <View style={styles.header}>
        <Badge label="Join the crew" tone="warning" />
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.hint}>
          Use your <Text style={styles.hintStrong}>@lgu.edu.pk</Text> email — your name, department, and enrollment
          year all come straight from the official student roster.
        </Text>
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
        <TextField label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Register" onPress={handleSubmit} loading={isSubmitting} style={styles.submit} />
      </Card>

      <Text style={styles.footer}>
        Already have an account?{" "}
        <Text style={styles.link} onPress={() => router.push("/(auth)/login")}>
          Log in
        </Text>
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginTop: spacing.sm, textAlign: "center" },
  hint: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted, lineHeight: 20, textAlign: "center" },
  hintStrong: { color: colors.ink, fontFamily: font.familyMedium },
  card: { gap: spacing.md },
  submit: { marginTop: spacing.xs },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  footer: { textAlign: "center", color: colors.textSecondary, fontFamily: font.familyRegular, marginTop: spacing.xl, fontSize: typography.size.sm },
  link: { color: colors.primary, fontFamily: font.familyMedium },
});
