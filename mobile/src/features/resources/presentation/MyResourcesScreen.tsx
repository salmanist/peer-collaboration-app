import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function MyResourcesScreen() {
  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.backLink}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>My Resources</Text>
      <Text style={styles.subtitle}>Manage what you offer and what you need.</Text>

      <Pressable style={styles.card} onPress={() => router.push("/resources/listings")}>
        <Text style={styles.cardTitle}>My Listings</Text>
        <Text style={styles.cardText}>View your available resources or add a new listing.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push("/resources/wanted/mine")}>
        <Text style={styles.cardTitle}>My Requests</Text>
        <Text style={styles.cardText}>View resources you asked for or create a new request.</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flex: 1, padding: 20, paddingTop: 56 },
  backLink: { color: "#1d4ed8", fontWeight: "700", marginBottom: 20 },
  title: { color: "#0f172a", fontSize: 27, fontWeight: "700" },
  subtitle: { color: "#64748b", marginTop: 5 },
  card: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 12, borderWidth: 1, marginTop: 20, padding: 18 },
  cardTitle: { color: "#0f172a", fontSize: 19, fontWeight: "700" },
  cardText: { color: "#64748b", lineHeight: 20, marginTop: 6 },
});
