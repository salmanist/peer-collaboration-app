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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSessionStore } from "../../../core/auth/session";
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
  const currentUser = useSessionStore((state) => state.user);

  const [item, setItem] = useState<LostAndFoundItem | null>(null);
  const [claims, setClaims] = useState<ItemClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Claim Modal State
  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState("");

  // Full-screen Image Viewer
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!Number.isInteger(itemId)) {
      setErrorMessage("Invalid notice link.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const itemData = await fetchLostAndFoundItem(itemId);
      setItem(itemData);

      if (currentUser && itemData.poster_id === currentUser.id) {
        const claimsData = await fetchItemClaims(itemId);
        setClaims(claimsData.results);
      }
      setErrorMessage("");
    } catch {
      setErrorMessage("Could not load notice details.");
    } finally {
      setIsLoading(false);
    }
  }, [itemId, currentUser]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>← Back</Text>
          </Pressable>
        </View>
        <Text style={styles.errorText}>{errorMessage || "Item not found."}</Text>
      </View>
    );
  }

  const isOwner = currentUser?.id === item.poster_id;
  const isLost = item.post_type === "lost";
  const imageUrl = getImageUrl(item.image);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>← Back to Feed</Text>
          </Pressable>
          {isOwner ? (
            <View style={styles.ownerHeaderActions}>
              <Pressable
                style={styles.editHeaderBtn}
                onPress={() => router.push(`/(app)/lost-and-found/edit/${item.id}`)}
              >
                <Text style={styles.editHeaderBtnText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.deleteHeaderBtn} onPress={handleDelete}>
                <Text style={styles.deleteHeaderBtnText}>Delete</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

        {/* Photo Banner */}
        {imageUrl ? (
          <Pressable onPress={() => setIsImageViewerVisible(true)} style={styles.bannerPressable}>
            <Image source={{ uri: imageUrl }} style={styles.photoBanner} resizeMode="cover" />
            <View style={styles.bannerTapHint}>
              <Text style={styles.bannerTapText}>🔍 Tap to enlarge</Text>
            </View>
          </Pressable>
        ) : (
          <View style={[styles.noPhotoBanner, isLost ? styles.noPhotoLost : styles.noPhotoFound]}>
            <Text style={styles.noPhotoEmoji}>{isLost ? "🔍" : "📦"}</Text>
            <Text style={styles.noPhotoText}>No photo attached</Text>
          </View>
        )}

        {/* Main Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.tagsRow}>
            <View style={[styles.typeBadge, isLost ? styles.typeBadgeLost : styles.typeBadgeFound]}>
              <Text style={[styles.typeBadgeText, isLost ? styles.typeBadgeTextLost : styles.typeBadgeTextFound]}>
                {isLost ? "LOST ITEM" : "FOUND ITEM"}
              </Text>
            </View>
            <View style={[styles.statusBadge, item.status === "open" ? styles.statusOpen : styles.statusClosed]}>
              <Text style={[styles.statusBadgeText, item.status === "open" ? styles.statusOpenText : styles.statusClosedText]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.itemTitle}>{item.title}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLocation}>📍 {item.location}</Text>
            {item.date_lost_or_found ? (
              <Text style={styles.metaDate}>🗓️ {item.date_lost_or_found}</Text>
            ) : null}
          </View>

          <Text style={styles.sectionHeading}>Description</Text>
          <Text style={styles.descriptionText}>{item.description}</Text>

          <View style={styles.divider} />

          {/* Poster Information */}
          <Text style={styles.sectionHeading}>Reported By</Text>
          <View style={styles.posterCard}>
            <View style={styles.posterAvatar}>
              <Text style={styles.posterAvatarText}>
                {(item.poster_name?.trim() || item.poster_email || "S").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.posterInfo}>
              <Text style={styles.posterName}>
                {item.poster_name?.trim() || item.poster_email?.split("@")[0] || "Student"}
              </Text>
              <Text style={styles.posterMeta}>
                {item.poster_department ? `${item.poster_department} • ` : ""}
                {item.poster_email}
              </Text>
            </View>
          </View>

        </View>

        {/* Owner Controls */}
        {isOwner ? (
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Post Management</Text>
            {item.status === "open" ? (
              <Pressable style={styles.resolveBtn} onPress={() => void handleStatusChange("resolved")}>
                <Text style={styles.resolveBtnText}>✓ Mark as Resolved / Handed Over</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.reopenBtn} onPress={() => void handleStatusChange("open")}>
                <Text style={styles.reopenBtnText}>↺ Re-open Notice</Text>
              </Pressable>
            )}

            {/* Claims list for owner */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>
              Inquiries & Claims ({claims.length})
            </Text>
            {claims.length === 0 ? (
              <Text style={styles.noClaimsText}>No claims or inquiries submitted yet.</Text>
            ) : (
              claims.map((claim) => (
                <View key={claim.id} style={styles.claimItem}>
                  <View style={styles.claimTopRow}>
                    <Text style={styles.claimantName}>{claim.claimant_name}</Text>
                    <Text style={styles.claimStatus}>[{claim.status.toUpperCase()}]</Text>
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
                      <Text style={styles.chatActionBtnText}>💬 Open Live Handover Chat</Text>
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
                <Text style={styles.resolvedNoticeText}>
                  This notice has been marked as {item.status}.
                </Text>
              </View>
            ) : item.has_user_claimed ? (
              <View style={styles.claimedNotice}>
                <Text style={styles.claimedNoticeText}>
                  ✓ You have submitted a claim/inquiry for this item. Check "My Notices" to view status or chat.
                </Text>
              </View>
            ) : (
              <Pressable style={styles.claimBtn} onPress={() => setIsClaimModalVisible(true)}>
                <Text style={styles.claimBtnText}>
                  {isLost ? "💬 I Found This Item / Have Info" : "🙋 This is My Item / Claim"}
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
              <Pressable onPress={() => setIsClaimModalVisible(false)}>
                <Text style={styles.modalCloseX}>✕</Text>
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
                  <ActivityIndicator size="small" color="#ffffff" />
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
            <Text style={styles.fullImageCloseText}>✕ Close</Text>
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
  container: { flex: 1, backgroundColor: "#f8fafc", paddingTop: 56 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backLink: { color: "#1d4ed8", fontWeight: "700", fontSize: 14 },
  ownerHeaderActions: { flexDirection: "row", gap: 10 },
  editHeaderBtn: { backgroundColor: "#e2e8f0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  editHeaderBtnText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  deleteHeaderBtn: { backgroundColor: "#fee2e2", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  deleteHeaderBtnText: { color: "#b91c1c", fontWeight: "700", fontSize: 12 },
  errorBanner: { backgroundColor: "#fee2e2", color: "#b91c1c", marginHorizontal: 20, padding: 12, borderRadius: 8, marginBottom: 12 },
  errorText: { color: "#b91c1c", fontSize: 13, marginBottom: 8 },
  bannerPressable: { width: "100%", height: 260, backgroundColor: "#000000" },
  photoBanner: { width: "100%", height: "100%" },
  bannerTapHint: { position: "absolute", bottom: 10, right: 14, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  bannerTapText: { color: "#ffffff", fontSize: 11, fontWeight: "600" },
  noPhotoBanner: { height: 160, justifyContent: "center", alignItems: "center", marginHorizontal: 20, borderRadius: 12 },
  noPhotoLost: { backgroundColor: "#fee2e2" },
  noPhotoFound: { backgroundColor: "#ecfdf5" },
  noPhotoEmoji: { fontSize: 44, marginBottom: 6 },
  noPhotoText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  detailsCard: { backgroundColor: "#ffffff", margin: 20, borderRadius: 12, padding: 18, borderColor: "#e2e8f0", borderWidth: 1 },
  tagsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeBadgeLost: { backgroundColor: "#fee2e2" },
  typeBadgeFound: { backgroundColor: "#d1fae5" },
  typeBadgeText: { fontSize: 12, fontWeight: "800" },
  typeBadgeTextLost: { color: "#b91c1c" },
  typeBadgeTextFound: { color: "#047857" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusOpen: { backgroundColor: "#f1f5f9" },
  statusClosed: { backgroundColor: "#e2e8f0" },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusOpenText: { color: "#0284c7" },
  statusClosedText: { color: "#64748b" },
  itemTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginTop: 12 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 8 },
  metaLocation: { fontSize: 13, color: "#2563eb", fontWeight: "700" },
  metaDate: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  sectionHeading: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginTop: 16, marginBottom: 6 },
  descriptionText: { fontSize: 14, color: "#475569", lineHeight: 22 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 16 },
  posterCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f8fafc", padding: 12, borderRadius: 8 },
  posterAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#1d4ed8", justifyContent: "center", alignItems: "center" },
  posterAvatarText: { color: "#ffffff", fontWeight: "800", fontSize: 16 },
  posterInfo: { flex: 1 },
  posterName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  posterMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  actionsCard: { backgroundColor: "#ffffff", marginHorizontal: 20, borderRadius: 12, padding: 18, borderColor: "#e2e8f0", borderWidth: 1 },
  actionsTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  resolveBtn: { backgroundColor: "#059669", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  resolveBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  reopenBtn: { backgroundColor: "#64748b", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  reopenBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  noClaimsText: { fontSize: 13, color: "#94a3b8", fontStyle: "italic", marginTop: 6 },
  claimItem: { backgroundColor: "#f8fafc", padding: 12, borderRadius: 8, marginTop: 8, borderColor: "#e2e8f0", borderWidth: 1 },
  claimTopRow: { flexDirection: "row", justifyContent: "space-between" },
  claimantName: { fontWeight: "700", fontSize: 13, color: "#0f172a" },
  claimStatus: { fontSize: 11, fontWeight: "700", color: "#6366f1" },
  claimMessage: { fontSize: 12, color: "#475569", marginTop: 4 },
  chatActionBtn: { backgroundColor: "#1d4ed8", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginTop: 8, alignItems: "center" },
  chatActionBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  claimBtn: { backgroundColor: "#1d4ed8", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  claimBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
  resolvedNotice: { backgroundColor: "#f1f5f9", padding: 14, borderRadius: 8, alignItems: "center" },
  resolvedNoticeText: { color: "#64748b", fontWeight: "600", fontSize: 13 },
  claimedNotice: { backgroundColor: "#d1fae5", padding: 14, borderRadius: 8 },
  claimedNoticeText: { color: "#065f46", fontWeight: "600", fontSize: 13, textAlign: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  claimModalCard: { backgroundColor: "#ffffff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 22 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  modalCloseX: { fontSize: 18, color: "#64748b", padding: 4 },
  modalSubtitle: { fontSize: 13, color: "#64748b", marginTop: 6, marginBottom: 14 },
  claimInput: { borderColor: "#cbd5e1", borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 90, textAlignVertical: "top", fontSize: 14 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 18 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: "#64748b", fontWeight: "700" },
  modalSubmitBtn: { backgroundColor: "#1d4ed8", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  modalSubmitText: { color: "#ffffff", fontWeight: "700" },
  btnDisabled: { backgroundColor: "#94a3b8" },
  fullImageBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center", padding: 16 },
  fullImageClose: { position: "absolute", top: 48, right: 20, zIndex: 10, padding: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  fullImageCloseText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  fullImage: { width: "100%", height: "80%" },
});
