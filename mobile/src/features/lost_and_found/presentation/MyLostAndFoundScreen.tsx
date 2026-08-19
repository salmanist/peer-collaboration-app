import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API_BASE_URL } from "../../../core/network/apiClient";
import {
  deleteLostAndFoundItem,
  fetchIncomingItemClaims,
  fetchMyItemClaims,
  fetchMyLostAndFoundItems,
  updateItemClaimStatus,
  updateLostAndFoundItemStatus,
} from "../data/lostAndFoundApi";
import type { ItemClaim, LostAndFoundItem } from "../lostAndFound";
import { useLostAndFoundNotificationStore } from "../lostAndFoundNotifications";

type TabType = "my_notices" | "incoming_claims" | "my_claims";

function getImageUrl(imagePath: string | null) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    try {
      const url = new URL(imagePath);
      const backendUrl = new URL(API_BASE_URL);
      return `${backendUrl.protocol}//${backendUrl.host}${url.pathname}${url.search}`;
    } catch {
      return imagePath;
    }
  }
  const host = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${host}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

export default function MyLostAndFoundScreen() {
  const markClaimsSeen = useLostAndFoundNotificationStore((state) => state.markClaimsSeen);
  const [activeTab, setActiveTab] = useState<TabType>("my_notices");

  const [myNotices, setMyNotices] = useState<LostAndFoundItem[]>([]);
  const [incomingClaims, setIncomingClaims] = useState<ItemClaim[]>([]);
  const [myClaims, setMyClaims] = useState<ItemClaim[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async (shouldRefresh: boolean = false) => {
    try {
      if (!shouldRefresh) setIsLoading(true);
      const [noticesRes, incomingRes, myClaimsRes] = await Promise.all([
        fetchMyLostAndFoundItems(),
        fetchIncomingItemClaims(),
        fetchMyItemClaims(),
      ]);

      setMyNotices(noticesRes.results);
      setIncomingClaims(incomingRes.results);
      setMyClaims(myClaimsRes.results);
      setErrorMessage("");
    } catch {
      setErrorMessage("Could not load your lost and found activity.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    markClaimsSeen();
    void loadData();
  }, [loadData, markClaimsSeen]);

  const onRefresh = () => {
    setIsRefreshing(true);
    markClaimsSeen();
    void loadData(true);
  };

  const handleClaimStatus = async (claimId: number, status: "accepted" | "declined") => {
    try {
      await updateItemClaimStatus(claimId, status);
      void loadData(true);
    } catch {
      setErrorMessage("Could not update claim status.");
    }
  };

  const handleItemStatusToggle = async (itemId: number, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === "open" ? "resolved" : "open";
      await updateLostAndFoundItemStatus(itemId, nextStatus);
      void loadData(true);
    } catch {
      setErrorMessage("Could not update item status.");
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteLostAndFoundItem(itemId);
      void loadData(true);
    } catch {
      setErrorMessage("Could not delete notice.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Notices & Claims</Text>
        <Pressable style={styles.postBtn} onPress={() => router.push("/(app)/lost-and-found/create")}>
          <Text style={styles.postBtnText}>+ Post Notice</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "my_notices" && styles.tabActive]}
          onPress={() => setActiveTab("my_notices")}
        >
          <Text style={[styles.tabText, activeTab === "my_notices" && styles.tabTextActive]}>
            My Notices ({myNotices.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "incoming_claims" && styles.tabActive]}
          onPress={() => setActiveTab("incoming_claims")}
        >
          <Text style={[styles.tabText, activeTab === "incoming_claims" && styles.tabTextActive]}>
            Incoming ({incomingClaims.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "my_claims" && styles.tabActive]}
          onPress={() => setActiveTab("my_claims")}
        >
          <Text style={[styles.tabText, activeTab === "my_claims" && styles.tabTextActive]}>
            Sent Claims ({myClaims.length})
          </Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : activeTab === "my_notices" ? (
        /* Tab 1: My Notices */
        <FlatList
          data={myNotices}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={myNotices.length === 0 ? styles.emptyList : styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No notices posted yet</Text>
              <Text style={styles.emptySubtitle}>You haven't posted any lost or found notices yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isLost = item.post_type === "lost";
            const imageUrl = getImageUrl(item.image);
            return (
              <View style={styles.card}>
                <Pressable
                  style={styles.cardHeader}
                  onPress={() => router.push(`/(app)/lost-and-found/${item.id}`)}
                >
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cardThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cardThumbPlaceholder, isLost ? styles.placeholderLost : styles.placeholderFound]}>
                      <Text style={styles.placeholderEmoji}>{isLost ? "🔍" : "📦"}</Text>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.typeBadge, isLost ? styles.typeBadgeLost : styles.typeBadgeFound]}>
                        <Text style={[styles.typeBadgeText, isLost ? styles.typeBadgeTextLost : styles.typeBadgeTextFound]}>
                          {isLost ? "LOST" : "FOUND"}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, item.status === "open" ? styles.statusOpen : styles.statusClosed]}>
                        <Text style={[styles.statusBadgeText, item.status === "open" ? styles.statusOpenText : styles.statusClosedText]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardLocation} numberOfLines={1}>📍 {item.location}</Text>
                    <Text style={styles.claimsCountText}>💬 {item.claims_count} claim{item.claims_count === 1 ? "" : "s"}</Text>
                  </View>
                </Pressable>

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.statusActionBtn}
                    onPress={() => void handleItemStatusToggle(item.id, item.status)}
                  >
                    <Text style={styles.statusActionBtnText}>
                      {item.status === "open" ? "✓ Mark Resolved" : "↺ Re-open"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.editActionBtn}
                    onPress={() => router.push(`/(app)/lost-and-found/edit/${item.id}`)}
                  >
                    <Text style={styles.editActionBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteActionBtn}
                    onPress={() => void handleDeleteItem(item.id)}
                  >
                    <Text style={styles.deleteActionBtnText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      ) : activeTab === "incoming_claims" ? (
        /* Tab 2: Incoming Claims */
        <FlatList
          data={incomingClaims}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={incomingClaims.length === 0 ? styles.emptyList : styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📬</Text>
              <Text style={styles.emptyTitle}>No incoming claims</Text>
              <Text style={styles.emptySubtitle}>When other students respond to your notices, you will see their claims here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.claimItemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimNoticeTitle}>For: {item.item_title}</Text>
                  <Text style={styles.claimantDetails}>
                    Claim by <Text style={{ fontWeight: "700" }}>{item.claimant_name}</Text> ({item.claimant_email})
                  </Text>
                </View>
                <View style={[styles.statusBadge, item.status === "accepted" ? styles.statusAccepted : styles.statusOpen]}>
                  <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.claimBodyText}>"{item.message}"</Text>

              <View style={styles.claimActionsRow}>
                {item.status === "pending" ? (
                  <>
                    <Pressable
                      style={styles.acceptBtn}
                      onPress={() => void handleClaimStatus(item.id, "accepted")}
                    >
                      <Text style={styles.acceptBtnText}>✓ Accept Claim</Text>
                    </Pressable>
                    <Pressable
                      style={styles.declineBtn}
                      onPress={() => void handleClaimStatus(item.id, "declined")}
                    >
                      <Text style={styles.declineBtnText}>✕ Decline</Text>
                    </Pressable>
                  </>
                ) : item.status === "accepted" ? (
                  <Pressable
                    style={styles.chatBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/lost-and-found/chat/[claimId]",
                        params: { claimId: String(item.id), itemTitle: item.item_title },
                      })
                    }
                  >
                    <Text style={styles.chatBtnText}>💬 Open Handover Chat</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}
        />
      ) : (
        /* Tab 3: My Claims (Sent) */
        <FlatList
          data={myClaims}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={myClaims.length === 0 ? styles.emptyList : styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📤</Text>
              <Text style={styles.emptyTitle}>No sent claims</Text>
              <Text style={styles.emptySubtitle}>You haven't submitted any claims or inquiries on items yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.claimItemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimNoticeTitle}>{item.item_title}</Text>
                  <Text style={styles.claimantDetails}>Posted by {item.poster_name} • 📍 {item.item_location}</Text>
                </View>
                <View style={[styles.statusBadge, item.status === "accepted" ? styles.statusAccepted : styles.statusOpen]}>
                  <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.claimBodyText}>Your message: "{item.message}"</Text>

              {item.status === "accepted" ? (
                <Pressable
                  style={[styles.chatBtn, { marginTop: 10 }]}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/lost-and-found/chat/[claimId]",
                      params: { claimId: String(item.id), itemTitle: item.item_title },
                    })
                  }
                >
                  <Text style={styles.chatBtnText}>💬 Open Handover Chat</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingTop: 56 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  postBtn: { backgroundColor: "#1d4ed8", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  postBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  tabBar: { flexDirection: "row", paddingHorizontal: 20, gap: 6, marginVertical: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#e2e8f0", alignItems: "center" },
  tabActive: { backgroundColor: "#1d4ed8" },
  tabText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  tabTextActive: { color: "#ffffff" },
  errorText: { color: "#b91c1c", paddingHorizontal: 20, paddingVertical: 6, fontSize: 13 },
  list: { padding: 20, gap: 14 },
  emptyList: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyContainer: { alignItems: "center", maxWidth: 300 },
  emptyEmoji: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  emptySubtitle: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 4 },
  card: { backgroundColor: "#ffffff", borderRadius: 12, borderColor: "#e2e8f0", borderWidth: 1, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardHeader: { flexDirection: "row", gap: 12 },
  cardThumb: { width: 80, height: 80, borderRadius: 8 },
  cardThumbPlaceholder: { width: 80, height: 80, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  placeholderLost: { backgroundColor: "#fee2e2" },
  placeholderFound: { backgroundColor: "#ecfdf5" },
  placeholderEmoji: { fontSize: 26 },
  cardInfo: { flex: 1, justifyContent: "space-between" },
  badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeLost: { backgroundColor: "#fee2e2" },
  typeBadgeFound: { backgroundColor: "#d1fae5" },
  typeBadgeText: { fontSize: 10, fontWeight: "800" },
  typeBadgeTextLost: { color: "#b91c1c" },
  typeBadgeTextFound: { color: "#047857" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusOpen: { backgroundColor: "#f1f5f9" },
  statusClosed: { backgroundColor: "#e2e8f0" },
  statusAccepted: { backgroundColor: "#d1fae5" },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  statusOpenText: { color: "#0284c7" },
  statusClosedText: { color: "#64748b" },

  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginTop: 2 },
  cardLocation: { fontSize: 12, color: "#2563eb", fontWeight: "600", marginTop: 1 },
  claimsCountText: { fontSize: 11, color: "#6366f1", fontWeight: "600", marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 10, borderTopColor: "#f1f5f9", borderTopWidth: 1 },
  statusActionBtn: { flex: 1, backgroundColor: "#f1f5f9", paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  statusActionBtnText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  editActionBtn: { paddingHorizontal: 14, backgroundColor: "#e2e8f0", paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  editActionBtnText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  deleteActionBtn: { paddingHorizontal: 12, backgroundColor: "#fee2e2", paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  deleteActionBtnText: { color: "#b91c1c", fontWeight: "700", fontSize: 12 },
  claimItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  claimNoticeTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  claimantDetails: { fontSize: 12, color: "#64748b", marginTop: 2 },
  claimBodyText: { fontSize: 13, color: "#475569", backgroundColor: "#f8fafc", padding: 10, borderRadius: 6, marginTop: 8, fontStyle: "italic" },
  claimActionsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  acceptBtn: { flex: 1, backgroundColor: "#059669", paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  acceptBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  declineBtn: { paddingHorizontal: 14, backgroundColor: "#f1f5f9", paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  declineBtnText: { color: "#64748b", fontWeight: "700", fontSize: 12 },
  chatBtn: { width: "100%", backgroundColor: "#1d4ed8", paddingVertical: 9, borderRadius: 6, alignItems: "center" },
  chatBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
});
