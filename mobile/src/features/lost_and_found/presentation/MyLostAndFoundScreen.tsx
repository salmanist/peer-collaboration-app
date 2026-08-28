import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useDataStore } from "../../../core/store/DataStoreContext";
import { SkeletonList, LostAndFoundCardSkeleton } from "../../../core/components/Skeleton";
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
  const insets = useSafeAreaInsets();
  const markClaimsSeen = useLostAndFoundNotificationStore((state) => state.markClaimsSeen);
  const { myLostAndFoundItems: cachedMyNotices, setMyLostAndFoundItems } = useDataStore();
  const [activeTab, setActiveTab] = useState<TabType>("my_notices");

  const [myNotices, setMyNotices] = useState<LostAndFoundItem[]>(() => cachedMyNotices || []);
  const [incomingClaims, setIncomingClaims] = useState<ItemClaim[]>([]);
  const [myClaims, setMyClaims] = useState<ItemClaim[]>([]);

  const [isLoading, setIsLoading] = useState(() => !(cachedMyNotices && cachedMyNotices.length > 0));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  const loadData = useCallback(async (shouldRefresh: boolean = false) => {
    try {
      if (!shouldRefresh && !myNotices.length) setIsLoading(true);
      const [noticesRes, incomingRes, myClaimsRes] = await Promise.all([
        fetchMyLostAndFoundItems(),
        fetchIncomingItemClaims(),
        fetchMyItemClaims(),
      ]);

      setMyNotices(noticesRes.results);
      setMyLostAndFoundItems(noticesRes.results);
      setIncomingClaims(incomingRes.results);
      setMyClaims(myClaimsRes.results);
      setErrorMessage("");
    } catch {
      setErrorMessage("Could not load your lost and found activity.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [myNotices.length, setMyLostAndFoundItems]);

  useEffect(() => {
    markClaimsSeen();
    if (!cachedMyNotices || cachedMyNotices.length === 0) {
      void loadData();
    }
  }, [cachedMyNotices, loadData, markClaimsSeen]);

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
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset + 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>My Notices & Claims</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "my_notices" && styles.tabActive]}
          onPress={() => setActiveTab("my_notices")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="bullhorn-outline"
              size={15}
              color={activeTab === "my_notices" ? "#0D3E02" : "#475569"}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabText, activeTab === "my_notices" && styles.tabTextActive]}>
              My Notices ({myNotices.length})
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "incoming_claims" && styles.tabActive]}
          onPress={() => setActiveTab("incoming_claims")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="inbox-arrow-down-outline"
              size={15}
              color={activeTab === "incoming_claims" ? "#0D3E02" : "#475569"}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabText, activeTab === "incoming_claims" && styles.tabTextActive]}>
              Incoming ({incomingClaims.length})
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "my_claims" && styles.tabActive]}
          onPress={() => setActiveTab("my_claims")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="send-outline"
              size={15}
              color={activeTab === "my_claims" ? "#0D3E02" : "#475569"}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabText, activeTab === "my_claims" && styles.tabTextActive]}>
              Sent Claims ({myClaims.length})
            </Text>
          </View>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <SkeletonList
          count={4}
          renderItem={() => <LostAndFoundCardSkeleton />}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
        />
      ) : activeTab === "my_notices" ? (
        /* Tab 1: My Notices */
        <FlatList
          data={myNotices}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant" size={48} color="#64748b" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No notices posted yet</Text>
              <Text style={styles.emptySubtitle}>
                Notices you post about lost or found campus items will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isLost = item.post_type === "lost";
            const imageUrl = getImageUrl(item.image);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cardThumb} resizeMode="cover" />
                  ) : (
                    <View
                      style={[
                        styles.cardThumbPlaceholder,
                        isLost ? styles.placeholderLost : styles.placeholderFound,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={isLost ? "help-circle-outline" : "package-variant-closed"}
                        size={24}
                        color="#64748b"
                      />
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.typeBadge,
                          isLost ? styles.typeBadgeLost : styles.typeBadgeFound,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            isLost ? styles.typeBadgeTextLost : styles.typeBadgeTextFound,
                          ]}
                        >
                          {item.post_type.toUpperCase()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === "open" ? styles.statusOpen : styles.statusClosed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            item.status === "open" ? styles.statusOpenText : styles.statusClosedText,
                          ]}
                        >
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                      <MaterialCommunityIcons name="map-marker" size={12} color="#64748b" style={{ marginRight: 3 }} />
                      <Text style={styles.cardLocation} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                      <MaterialCommunityIcons name="chat-processing-outline" size={12} color="#64748b" style={{ marginRight: 3 }} />
                      <Text style={styles.claimsCountText}>
                        {item.claims_count} claim inquiry{item.claims_count === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.statusActionBtn}
                    onPress={() => void handleItemStatusToggle(item.id, item.status)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialCommunityIcons
                        name={item.status === "open" ? "check-circle-outline" : "refresh"}
                        size={14}
                        color="#0D3E02"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.statusActionBtnText}>
                        {item.status === "open" ? "Mark Resolved" : "Re-open Notice"}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={styles.editActionBtn}
                    onPress={() => router.push(`/(app)/lost-and-found/edit/${item.id}` as any)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialCommunityIcons name="pencil-outline" size={14} color="#0D3E02" style={{ marginRight: 4 }} />
                      <Text style={styles.editActionBtnText}>Edit</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={styles.deleteActionBtn}
                    onPress={() => void handleDeleteItem(item.id)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={styles.deleteActionBtnText}>Delete</Text>
                    </View>
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
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="inbox-outline" size={48} color="#64748b" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No incoming claims</Text>
              <Text style={styles.emptySubtitle}>
                When peers reach out about items you reported found or lost, they will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.claimItemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimNoticeTitle}>Re: {item.item_title}</Text>
                  <Text style={styles.claimantDetails}>
                    Claimant: <Text style={{ fontWeight: "700", color: "#070D1F" }}>{item.claimant_name}</Text> ({item.claimant_department || "LGU Student"})
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === "accepted"
                      ? styles.statusAccepted
                      : item.status === "declined"
                      ? styles.statusClosed
                      : styles.statusOpen,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.claimBodyText}>"{item.message}"</Text>

              {item.status === "pending" ? (
                <View style={styles.claimActionsRow}>
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => void handleClaimStatus(item.id, "accepted")}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialCommunityIcons name="check" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.acceptBtnText}>Accept Claim & Chat</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.declineBtn}
                    onPress={() => void handleClaimStatus(item.id, "declined")}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialCommunityIcons name="close" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </View>
                  </Pressable>
                </View>
              ) : item.status === "accepted" ? (
                <View style={{ marginTop: 10 }}>
                  <Pressable
                    style={styles.chatBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/lost-and-found/chat/[claimId]" as any,
                        params: { claimId: item.id, itemTitle: item.item_title },
                      })
                    }
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                      <MaterialCommunityIcons name="chat-outline" size={15} color="#ffffff" style={{ marginRight: 5 }} />
                      <Text style={styles.chatBtnText}>Open Handover Chat</Text>
                    </View>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        />
      ) : (
        /* Tab 3: Sent Claims */
        <FlatList
          data={myClaims}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="send-outline" size={48} color="#64748b" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No claims sent</Text>
              <Text style={styles.emptySubtitle}>
                Inquiries and claims you submit on posted notices will be tracked here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.claimItemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimNoticeTitle}>{item.item_title}</Text>
                  <Text style={styles.claimantDetails}>
                    Posted by: <Text style={{ fontWeight: "700", color: "#070D1F" }}>{item.poster_name}</Text>
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === "accepted"
                      ? styles.statusAccepted
                      : item.status === "declined"
                      ? styles.statusClosed
                      : styles.statusOpen,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.claimBodyText}>"{item.message}"</Text>

              {item.status === "accepted" ? (
                <View style={{ marginTop: 10 }}>
                  <Pressable
                    style={styles.chatBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/lost-and-found/chat/[claimId]" as any,
                        params: { claimId: item.id, itemTitle: item.item_title },
                      })
                    }
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                      <MaterialCommunityIcons name="chat-outline" size={15} color="#ffffff" style={{ marginRight: 5 }} />
                      <Text style={styles.chatBtnText}>Open Handover Chat</Text>
                    </View>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  topNavBar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
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
  tabBar: { flexDirection: "row", padding: 4, marginHorizontal: 16, marginVertical: 12, backgroundColor: "#E2E8F0", borderRadius: 14 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: "#ffffff", shadowColor: "#000000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: "700", color: "#64748B", textAlign: "center", includeFontPadding: false },
  tabTextActive: { color: "#0D3E02", fontWeight: "800" },
  errorBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#fee2e2", marginHorizontal: 16, marginVertical: 6, padding: 10, borderRadius: 8 },
  errorText: { color: "#b91c1c", fontSize: 13, flex: 1 },
  list: { padding: 16, gap: 14 },
  emptyContainer: { alignItems: "center", maxWidth: 300, alignSelf: "center", marginTop: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "900", color: "#0F172A", letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: "#64748B", textAlign: "center", marginTop: 4, lineHeight: 18 },
  card: { backgroundColor: "#ffffff", borderRadius: 20, borderColor: "#F1F5F9", borderWidth: 1, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", gap: 14 },
  cardThumb: { width: 88, height: 88, borderRadius: 14 },
  cardThumbPlaceholder: { width: 88, height: 88, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  placeholderLost: { backgroundColor: "#FEE2E2" },
  placeholderFound: { backgroundColor: "#ECFDF5" },
  placeholderEmoji: { fontSize: 26 },
  cardInfo: { flex: 1, justifyContent: "space-between" },
  badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  typeBadgeLost: { backgroundColor: "#FEE2E2" },
  typeBadgeFound: { backgroundColor: "#D1FAE5" },
  typeBadgeText: { fontSize: 10, fontWeight: "900", textAlign: "center", includeFontPadding: false },
  typeBadgeTextLost: { color: "#B91C1C" },
  typeBadgeTextFound: { color: "#047857" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  statusOpen: { backgroundColor: "#F1F5F9" },
  statusClosed: { backgroundColor: "#E2E8F0" },
  statusAccepted: { backgroundColor: "#D1FAE5" },
  statusBadgeText: { fontSize: 10, fontWeight: "800", textAlign: "center", includeFontPadding: false },
  statusOpenText: { color: "#0284c7" },
  statusClosedText: { color: "#64748B" },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A", letterSpacing: -0.2, marginTop: 2 },
  cardLocation: { fontSize: 12, color: "#0D3E02", fontWeight: "700", marginTop: 1 },
  claimsCountText: { fontSize: 11, color: "#64748B", fontWeight: "600", marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 14, paddingTop: 12, borderTopColor: "#F1F5F9", borderTopWidth: 1 },
  statusActionBtn: { flex: 1, backgroundColor: "#F8FAFC", paddingVertical: 9, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  statusActionBtnText: { color: "#334155", fontWeight: "800", fontSize: 12, textAlign: "center", includeFontPadding: false },
  editActionBtn: { paddingHorizontal: 14, backgroundColor: "#F1F5F9", paddingVertical: 9, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  editActionBtnText: { color: "#334155", fontWeight: "800", fontSize: 12, textAlign: "center", includeFontPadding: false },
  deleteActionBtn: { paddingHorizontal: 12, backgroundColor: "#FEE2E2", paddingVertical: 9, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deleteActionBtnText: { color: "#B91C1C", fontWeight: "800", fontSize: 12, textAlign: "center", includeFontPadding: false },
  claimItemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  claimNoticeTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A", letterSpacing: -0.2 },
  claimantDetails: { fontSize: 12, color: "#64748B", marginTop: 2, fontWeight: "500" },
  claimBodyText: { fontSize: 13, color: "#475569", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 10, marginTop: 8, fontStyle: "italic", borderWidth: 1, borderColor: "#F1F5F9" },
  claimActionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  acceptBtn: { flex: 1, backgroundColor: "#0D3E02", paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  acceptBtnText: { color: "#FDBF1E", fontWeight: "900", fontSize: 12 },
  declineBtn: { paddingHorizontal: 14, backgroundColor: "#F1F5F9", paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  declineBtnText: { color: "#64748B", fontWeight: "800", fontSize: 12 },
  chatBtn: { width: "100%", backgroundColor: "#0D3E02", paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  chatBtnText: { color: "#FDBF1E", fontWeight: "900", fontSize: 13 },
});
