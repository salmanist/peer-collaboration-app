import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSessionStore } from "../../../core/auth/session";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { LostAndFoundDetailSkeleton } from "../../../core/components/Skeleton";
import { API_BASE_URL } from "../../../core/network/apiClient";
import {
  createItemClaim,
  deleteLostAndFoundItem,
  fetchItemClaims,
  fetchLostAndFoundItem,
  updateLostAndFoundItemStatus,
} from "../data/lostAndFoundApi";
import type { ItemClaim, LostAndFoundItem } from "../lostAndFound";

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

export default function LostAndFoundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const insets = useSafeAreaInsets();
  const currentUser = useSessionStore((state) => state.user);
  const { lostAndFoundItems } = useDataStore();

  const cachedItem = (lostAndFoundItems || []).find((i: LostAndFoundItem) => i.id === itemId) || null;

  const [item, setItem] = useState<LostAndFoundItem | null>(() => cachedItem);
  const [claims, setClaims] = useState<ItemClaim[]>([]);
  const [isLoading, setIsLoading] = useState(() => !cachedItem);
  const [errorMessage, setErrorMessage] = useState("");

  // Claim Modal State
  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState("");

  // Full-screen Image Viewer
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  const loadData = useCallback(async () => {
    if (!Number.isInteger(itemId)) {
      setErrorMessage("Invalid notice link.");
      setIsLoading(false);
      return;
    }

    try {
      if (!cachedItem && !item) {
        setIsLoading(true);
      }
      const itemData = await fetchLostAndFoundItem(itemId);
      setItem(itemData);

      if (currentUser && itemData.poster_id === currentUser.id) {
        const claimsData = await fetchItemClaims(itemId);
        setClaims(claimsData.results);
      }
      setErrorMessage("");
    } catch {
      if (!item && !cachedItem) {
        setErrorMessage("Could not load notice details.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [itemId, currentUser, cachedItem, item]);

  useEffect(() => {
    void loadData();
  }, [itemId]);

  const handleClaimSubmit = async () => {
    if (!claimMessage.trim()) {
      setClaimError("Please provide details or proof of ownership.");
      return;
    }

    setIsSubmittingClaim(true);
    setClaimError("");

    try {
      await createItemClaim(itemId, { message: claimMessage.trim() });
      setIsClaimModalVisible(false);
      setClaimMessage("");
      void loadData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Could not submit claim.";
      setClaimError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleStatusChange = async (newStatus: "resolved" | "open") => {
    try {
      await updateLostAndFoundItemStatus(itemId, newStatus);
      void loadData();
    } catch {
      setErrorMessage("Could not update notice status.");
    }
  };

  const handleDelete = () => {
    const doDelete = async () => {
      try {
        await deleteLostAndFoundItem(itemId);
        router.back();
      } catch {
        setErrorMessage("Could not delete notice.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this notice?")) {
        void doDelete();
      }
    } else {
      Alert.alert("Delete Notice", "Are you sure you want to delete this notice?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void doDelete() },
      ]);
    }
  };

  if (isLoading && !item) {
    return (
      <View style={styles.container}>
        <View style={[styles.compactTopNav, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
          </Pressable>
          <Text style={styles.compactNavTitle}>Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <LostAndFoundDetailSkeleton />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={[styles.compactTopNav, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
          </Pressable>
          <Text style={styles.compactNavTitle}>Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centeredError}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorText}>{errorMessage || "Notice not found."}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void loadData()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isOwner = currentUser?.id === item.poster_id;
  const isLost = item.post_type === "lost";
  const imageUrl = getImageUrl(item.image);

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={[styles.compactTopNav, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.compactNavTitle}>Details</Text>
        {isOwner ? (
          <Pressable
            style={styles.editHeaderBtn}
            onPress={() => router.push(`/(app)/lost-and-found/edit/${item.id}`)}
          >
            <MaterialCommunityIcons name="pencil-outline" size={14} color="#0D3E02" />
            <Text style={styles.editHeaderBtnText}>Edit</Text>
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <View style={styles.errorBannerRow}>
            <MaterialCommunityIcons name="information" size={16} color="#B91C1C" />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Hero Notice Visual */}
        {imageUrl ? (
          <Pressable onPress={() => setIsImageViewerVisible(true)} style={styles.photoBannerCard}>
            <Image source={{ uri: imageUrl }} style={styles.photoBanner} resizeMode="cover" />
            <View style={styles.bannerTapHint}>
              <MaterialCommunityIcons name="magnify-plus-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.bannerTapText}>Tap to enlarge</Text>
            </View>
          </Pressable>
        ) : (
          <View style={[styles.noPhotoGraphicCard, isLost ? styles.noPhotoLost : styles.noPhotoFound]}>
            <View style={[styles.graphicIconCircle, isLost ? styles.iconCircleLost : styles.iconCircleFound]}>
              <MaterialCommunityIcons
                name={isLost ? "help-circle-outline" : "cube-scan"}
                size={34}
                color={isLost ? "#DC2626" : "#0D3E02"}
              />
            </View>
            <Text style={styles.graphicTitle}>{isLost ? "Reported Lost Item" : "Reported Found Item"}</Text>
            <Text style={styles.graphicSubtitle}>No reference photo uploaded by reporter</Text>
          </View>
        )}

        {/* Main Details Floating Card */}
        <View style={styles.detailsCard}>
          {/* Badges Row */}
          <View style={styles.tagsRow}>
            <View style={[styles.typeBadge, isLost ? styles.typeBadgeLost : styles.typeBadgeFound]}>
              <MaterialCommunityIcons
                name={isLost ? "alert-circle" : "check-decagram"}
                size={12}
                color={isLost ? "#B91C1C" : "#047857"}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.typeBadgeText, isLost ? styles.typeBadgeTextLost : styles.typeBadgeTextFound]}>
                {isLost ? "LOST ITEM" : "FOUND ITEM"}
              </Text>
            </View>
            <View style={[styles.statusBadge, item.status === "open" ? styles.statusOpen : styles.statusClosed]}>
              <Text style={[styles.statusBadgeText, item.status === "open" ? styles.statusOpenText : styles.statusClosedText]}>
                {item.status === "open" ? "ACTIVE" : "RESOLVED"}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.itemTitle}>{item.title}</Text>

          {/* Meta Info Pills */}
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#0D3E02" style={{ marginRight: 4 }} />
              <Text style={styles.metaLocation}>{item.location}</Text>
            </View>
            {item.date_lost_or_found ? (
              <View style={styles.metaPill}>
                <MaterialCommunityIcons name="calendar-clock" size={14} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.metaDate}>{item.date_lost_or_found}</Text>
              </View>
            ) : null}
          </View>

          {/* Description */}
          <Text style={styles.sectionHeading}>Description</Text>
          <Text style={styles.descriptionText}>{item.description}</Text>

          <View style={styles.divider} />

          {/* Reporter Information */}
          <Text style={styles.sectionHeading}>Reported By</Text>
          <View style={styles.posterCard}>
            <View style={styles.posterAvatar}>
              <MaterialCommunityIcons name="account" size={24} color="#0D3E02" />
            </View>
            <View style={styles.posterInfo}>
              <Text style={styles.posterName}>
                {item.poster_name?.trim() || item.poster_email?.split("@")[0] || "Campus Student"}
              </Text>
              <Text style={styles.posterMeta}>
                {item.poster_department ? `${item.poster_department} • ` : ""}
                {item.poster_email}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Card */}
        {isOwner ? (
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Post Management</Text>
            <View style={styles.ownerActionsColumn}>
              {item.status === "open" ? (
                <Pressable style={styles.resolveBtn} onPress={() => void handleStatusChange("resolved")}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="#0D3E02" style={{ marginRight: 6 }} />
                  <Text style={styles.resolveBtnText}>Mark as Resolved / Handed Over</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.reopenBtn} onPress={() => void handleStatusChange("open")}>
                  <MaterialCommunityIcons name="refresh" size={18} color="#0D3E02" style={{ marginRight: 6 }} />
                  <Text style={styles.reopenBtnText}>Re-open Notice</Text>
                </Pressable>
              )}

              <Pressable style={styles.deletePostBtn} onPress={handleDelete}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
                <Text style={styles.deletePostBtnText}>Delete Notice</Text>
              </Pressable>
            </View>

            {/* Claims list for owner */}
            <Text style={[styles.sectionHeading, { marginTop: 20 }]}>
              Inquiries & Claims ({claims.length})
            </Text>
            {claims.length === 0 ? (
              <Text style={styles.noClaimsText}>No claims or inquiries submitted yet.</Text>
            ) : (
              claims.map((claim) => (
                <View key={claim.id} style={styles.claimItem}>
                  <View style={styles.claimTopRow}>
                    <Text style={styles.claimantName}>{claim.claimant_name}</Text>
                    <View style={styles.claimStatusBadge}>
                      <Text style={styles.claimStatusText}>{claim.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.claimMessage}>"{claim.message}"</Text>
                  {claim.status === "accepted" ? (
                    <Pressable
                      style={styles.chatActionBtn}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/lost-and-found/chat/[claimId]",
                          params: { claimId: String(claim.id), itemTitle: item.title },
                        })
                      }
                    >
                      <MaterialCommunityIcons name="chat-outline" size={16} color="#0D3E02" style={{ marginRight: 6 }} />
                      <Text style={styles.chatActionBtnText}>Open Live Handover Chat</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : (
          /* Non-owner Action */
          <View style={styles.actionsCard}>
            {item.status !== "open" ? (
              <View style={styles.resolvedNotice}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#047857" style={{ marginRight: 8 }} />
                <Text style={styles.resolvedNoticeText}>
                  This notice has been marked as resolved.
                </Text>
              </View>
            ) : item.has_user_claimed ? (
              <View style={styles.claimedNotice}>
                <MaterialCommunityIcons name="clock-check-outline" size={20} color="#0D3E02" style={{ marginRight: 8 }} />
                <Text style={styles.claimedNoticeText}>
                  You have submitted a claim/inquiry for this item. Check "My Notices" to view status or chat.
                </Text>
              </View>
            ) : (
              <Pressable style={styles.primaryClaimBtn} onPress={() => setIsClaimModalVisible(true)}>
                <MaterialCommunityIcons
                  name={isLost ? "information-outline" : "hand-wave-outline"}
                  size={18}
                  color="#0D3E02"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.primaryClaimBtnText}>
                  {isLost ? "I Found This Item / Have Info" : "This is My Item / Claim"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Claim Submission Modal */}
      <Modal visible={isClaimModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.claimModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isLost ? "Contact Finder / Owner" : "Submit Item Claim"}
              </Text>
              <Pressable onPress={() => setIsClaimModalVisible(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#0F172A" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              {isLost
                ? "Describe where you found it or provide contact info so the owner can retrieve it."
                : "Describe unique marks, serial numbers, or contents to verify ownership."}
            </Text>

            {claimError ? <Text style={styles.errorText}>{claimError}</Text> : null}

            <TextInput
              style={styles.claimInput}
              placeholder="Type your message, verification details, or handover instructions..."
              placeholderTextColor="#94A3B8"
              value={claimMessage}
              onChangeText={setClaimMessage}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setIsClaimModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmitBtn, isSubmittingClaim && styles.btnDisabled]}
                onPress={() => void handleClaimSubmit()}
                disabled={isSubmittingClaim}
              >
                {isSubmittingClaim ? (
                  <ActivityIndicator size="small" color="#0D3E02" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Claim</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-screen Photo Viewer */}
      <Modal visible={isImageViewerVisible} transparent animationType="fade">
        <View style={styles.fullImageBackdrop}>
          <Pressable style={styles.fullImageClose} onPress={() => setIsImageViewerVisible(false)}>
            <MaterialCommunityIcons name="close" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.fullImageCloseText}>Close</Text>
          </Pressable>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.fullImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  compactTopNav: {
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  compactNavTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.3,
  },
  ownerHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDBF1E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editHeaderBtnText: {
    color: "#0D3E02",
    fontWeight: "900",
    fontSize: 12,
  },
  deleteHeaderBtn: {
    backgroundColor: "#FEE2E2",
    padding: 7,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingTop: 16,
  },
  errorBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorBannerText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  photoBannerCard: {
    marginHorizontal: 16,
    height: 240,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  photoBanner: {
    width: "100%",
    height: "100%",
  },
  bannerTapHint: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  bannerTapText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  noPhotoGraphicCard: {
    marginHorizontal: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  noPhotoLost: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FED7D7",
  },
  noPhotoFound: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  graphicIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconCircleLost: {
    backgroundColor: "#FEE2E2",
  },
  iconCircleFound: {
    backgroundColor: "#DCFCE7",
  },
  graphicTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  graphicSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    fontWeight: "500",
  },
  detailsCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    padding: 20,
    borderColor: "#F1F5F9",
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tagsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeLost: {
    backgroundColor: "#FEE2E2",
  },
  typeBadgeFound: {
    backgroundColor: "#D1FAE5",
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  typeBadgeTextLost: {
    color: "#B91C1C",
  },
  typeBadgeTextFound: {
    color: "#047857",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusOpen: {
    backgroundColor: "#F1F5F9",
  },
  statusClosed: {
    backgroundColor: "#E2E8F0",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusOpenText: {
    color: "#0284C7",
  },
  statusClosedText: {
    color: "#64748B",
  },
  itemTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
    marginTop: 12,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metaLocation: {
    fontSize: 12,
    color: "#0D3E02",
    fontWeight: "700",
  },
  metaDate: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 18,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  descriptionText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    fontWeight: "400",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 18,
  },
  posterCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  posterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0D3E02",
    justifyContent: "center",
    alignItems: "center",
  },
  posterAvatarText: {
    color: "#FDBF1E",
    fontWeight: "900",
    fontSize: 17,
  },
  posterInfo: {
    flex: 1,
  },
  posterName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  posterMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  actionsCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 24,
    padding: 20,
    borderColor: "#F1F5F9",
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  ownerActionsColumn: {
    gap: 10,
  },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDBF1E",
    paddingVertical: 13,
    borderRadius: 14,
  },
  resolveBtnText: {
    color: "#0D3E02",
    fontWeight: "900",
    fontSize: 13,
  },
  reopenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 13,
    borderRadius: 14,
  },
  reopenBtnText: {
    color: "#0D3E02",
    fontWeight: "800",
    fontSize: 13,
  },
  deletePostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FED7D7",
  },
  deletePostBtnText: {
    color: "#B91C1C",
    fontWeight: "800",
    fontSize: 13,
  },
  noClaimsText: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: 6,
  },
  claimItem: {
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 14,
    marginTop: 10,
    borderColor: "#E2E8F0",
    borderWidth: 1,
  },
  claimTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  claimantName: {
    fontWeight: "800",
    fontSize: 13,
    color: "#0F172A",
  },
  claimStatusBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  claimStatusText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#4338CA",
  },
  claimMessage: {
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
    lineHeight: 18,
  },
  chatActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDBF1E",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  chatActionBtnText: {
    color: "#0D3E02",
    fontWeight: "900",
    fontSize: 12,
  },
  primaryClaimBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#FDBF1E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryClaimBtnText: {
    color: "#0D3E02",
    fontWeight: "900",
    fontSize: 15,
  },
  resolvedNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  resolvedNoticeText: {
    color: "#047857",
    fontWeight: "700",
    fontSize: 13,
    flex: 1,
  },
  claimedNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  claimedNoticeText: {
    color: "#0D3E02",
    fontWeight: "700",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  claimModalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 18,
  },
  claimInput: {
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 18,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalCancelText: {
    color: "#64748B",
    fontWeight: "800",
  },
  modalSubmitBtn: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalSubmitText: {
    color: "#0D3E02",
    fontWeight: "900",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  fullImageBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  fullImageClose: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  fullImageCloseText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  fullImage: {
    width: "100%",
    height: "80%",
  },
  centeredError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: "#0D3E02",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  retryBtnText: {
    color: "#FDBF1E",
    fontWeight: "900",
    fontSize: 13,
  },
});
