import { router } from "expo-router";
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function MyResourcesScreen() {
  const insets = useSafeAreaInsets();
  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  return (
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset + 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/resources" as any))}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>My Resources</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.headline}>Manage Your Activity</Text>
        <Text style={styles.subheadline}>
          Track items you have shared with other students or requests you posted for books and materials.
        </Text>

        <Pressable
          style={styles.actionCard}
          onPress={() => router.push("/resources/mine" as any)}
        >
          <View style={styles.cardIconWrap}>
            <MaterialCommunityIcons name="package-variant-closed" size={24} color="#0D3E02" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>My Shared Listings</Text>
            <Text style={styles.cardText}>
              Manage availability, edit details, or delete items you posted for sharing.
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" />
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={() => router.push("/resources/wanted/mine" as any)}
        >
          <View style={styles.cardIconWrap}>
            <MaterialCommunityIcons name="hand-wave-outline" size={24} color="#0D3E02" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>My Resource Requests</Text>
            <Text style={styles.cardText}>
              View requested materials, manage incoming offers from peers, or post new needs.
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" />
        </Pressable>

        <Pressable
          style={styles.actionCard}
          onPress={() => router.push("/resources/requests" as any)}
        >
          <View style={styles.cardIconWrap}>
            <MaterialCommunityIcons name="chat-question-outline" size={24} color="#0D3E02" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Direct Interest Requests</Text>
            <Text style={styles.cardText}>
              Accept or decline direct borrow/buy inquiries on your listed items.
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  topNavBar: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A5D6A7",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#070D1F",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  headline: {
    color: "#070D1F",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subheadline: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderColor: "#E2E8F0",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: "#070D1F",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 16,
  },
  cardArrow: {
    color: "#94a3b8",
    fontSize: 24,
    fontWeight: "300",
  },
});
