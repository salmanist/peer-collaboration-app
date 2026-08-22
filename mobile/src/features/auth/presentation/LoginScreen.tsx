import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Button, Card, ScreenContainer, TextField, colors, font, spacing, typography } from "../../../core/ui";
import { useSessionStore } from "../../../core/auth/session";
import { login } from "../data/authApi";

export default function LoginScreen() {
  const setSession = useSessionStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await login(email.trim().toLowerCase(), password);
      await setSession({ access: data.access, refresh: data.refresh }, data.user);
      router.replace("/(app)/home");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scroll center>
      <View style={styles.brand}>
        <Badge label="LGU Peer" tone="primary" />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your student account</Text>
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
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Log in" onPress={handleSubmit} loading={isSubmitting} style={styles.submit} />
      </Card>

      <Text style={styles.footer}>
        New here?{" "}
        <Text style={styles.link} onPress={() => router.push("/(auth)/register")}>
          Create an account
        </Text>
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  title: { fontSize: typography.size.xl, fontFamily: font.serif, color: colors.ink, marginTop: spacing.sm },
  subtitle: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted },
  card: { gap: spacing.md },
  submit: { marginTop: spacing.xs },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  footer: { textAlign: "center", color: colors.textSecondary, fontFamily: font.familyRegular, marginTop: spacing.xl, fontSize: typography.size.sm },
  link: { color: colors.primary, fontFamily: font.familyMedium },
});
