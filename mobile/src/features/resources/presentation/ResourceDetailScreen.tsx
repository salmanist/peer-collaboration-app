import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { Skeleton, ResourceDetailSkeleton } from "../../../core/components/Skeleton";
import { API_BASE_URL } from "../../../core/network/apiClient";
import { createResourceInterestRequest, fetchResourceListing } from "../data/resourcesApi";
import type { ResourceListing } from "../resources";

function getImageUrl(imagePath: string | null) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const host = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${host}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

function getExchangeLabel(resource: ResourceListing) {
  if (resource.exchange_type === "free") return "100% Free";
  if (resource.exchange_type === "sell" && resource.price) {
    return `Rs. ${resource.price}`;
  }
  if (resource.exchange_type === "rent" && resource.price) {
    return `Rent: Rs. ${resource.price}`;
  }
  return resource.exchange_type.replace("_", " ").toUpperCase();
}

function getCategoryIconName(category: string): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (category) {
    case "books":
      return "book-open-page-variant";
    case "notes":
      return "file-document-edit-outline";
    case "lab_equipment":
      return "flask-outline";
    case "stationery":
      return "ruler-square";
    default:
      return "package-variant-closed";
  }
}

function getCategoryBg(category: string) {
  switch (category) {
    case "books":
      return appColors.surfaceMuted;
    case "notes":
      return appColors.amber50;
    case "lab_equipment":
      return appColors.surfaceMuted;
    case "stationery":
      return appColors.fuchsia50;
    default:
      return appColors.background;
  }
}

export default function ResourceDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const resourceId = Number(id);
  const currentUser = useSessionStore((state) => state.user);
  const { resourceListings } = useDataStore();

  const cachedResource = (resourceListings || []).find((r: ResourceListing) => r.id === resourceId) || null;

  const [resource, setResource] = useState<ResourceListing | null>(() => cachedResource);
  const [isLoading, setIsLoading] = useState(() => !cachedResource);
  const [errorMessage, setErrorMessage] = useState("");
  const [interestMessage, setInterestMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [hasRequested, setHasRequested] = useState<boolean>(() => Boolean(cachedResource?.has_requested));

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  useEffect(() => {
    async function loadResource() {
      if (cachedResource) {
        setResource(cachedResource);
        if (cachedResource.has_requested) setHasRequested(true);
        setIsLoading(false);
      }
      try {
        const data = await fetchResourceListing(resourceId);
        setResource(data);
        if (data.has_requested) setHasRequested(true);
      } catch {
        if (!cachedResource) {
          setErrorMessage("Failed to load resource details. It may have been removed.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadResource();
  }, [resourceId, cachedResource]);

  const handleInterestRequest = async () => {
    if (!resource || hasRequested) return;
    setIsSendingRequest(true);
    setRequestMessage("");

    try {
      await createResourceInterestRequest(resource.id, interestMessage.trim());
      setHasRequested(true);
      setRequestMessage("Interest request sent to owner! You will get a notification when they accept.");
      setInterestMessage("");
    } catch {
      setHasRequested(true);
      setRequestMessage("You have already requested this item.");
    } finally {
      setIsSendingRequest(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.rootContainer}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/resources")}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
          </Pressable>
          <Text style={styles.topNavTitle}>Resource Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <ResourceDetailSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (errorMessage || !resource) {
    return (
      <View style={styles.rootContainer}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/resources")}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
          </Pressable>
          <Text style={styles.topNavTitle}>Resource Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={44} color={appColors.red700} style={{ marginBottom: 12 }} />
          <Text style={styles.errorText}>{errorMessage || "Resource not found or may have been removed."}</Text>
          <Pressable
            style={[styles.interestBtn, { paddingHorizontal: 24, marginTop: 16 }]}
            onPress={() => goBack("/(app)/resources")}
          >
            <Text style={styles.interestBtnText}>Back to Marketplace</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const imageUrl = getImageUrl(resource.image);
  const isFree = resource.exchange_type === "free";
  const isOwnResource = currentUser?.id === resource.owner_id;

  return (
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => goBack("/(app)/resources")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>Resource Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        {/* Banner / Illustration */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.bannerImage} />
        ) : (
          <View style={[styles.bannerPlaceholder, { backgroundColor: getCategoryBg(resource.category) }]}>
            <MaterialCommunityIcons name={getCategoryIconName(resource.category)} size={64} color={appColors.textSecondary} />
          </View>
        )}

        {/* Badges Row */}
        <View style={styles.badgeRow}>
          <View style={[styles.priceTag, isFree ? styles.priceTagFree : styles.priceTagPaid]}>
            <Text style={[styles.priceTagText, isFree ? styles.priceTagTextFree : styles.priceTagTextPaid]}>
              {getExchangeLabel(resource)}
            </Text>
          </View>
          {resource.condition ? (
            <View style={styles.conditionTag}>
              <Text style={styles.conditionTagText}>
                {resource.condition.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Title */}
        <Text style={styles.title}>{resource.title}</Text>

        {/* Key Info Grid */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <View style={styles.infoValueWrap}>
              <MaterialCommunityIcons name={getCategoryIconName(resource.category)} size={14} color={appColors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.infoValue}>
                {resource.category.replace("_", " ")}
              </Text>
            </View>
          </View>

          {resource.course ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Course:</Text>
              <View style={styles.infoValueWrap}>
                <MaterialCommunityIcons name="target" size={14} color={appColors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.infoValue, { color: appColors.primary, fontWeight: "800" }]}>
                  {resource.course}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Offered by:</Text>
            <View style={styles.infoValueWrap}>
              <MaterialCommunityIcons name="account-outline" size={14} color={appColors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.infoValue} numberOfLines={2}>
                {resource.owner_name}
                {resource.owner_department ? ` (${resource.owner_department})` : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Description Section */}
        <Text style={styles.sectionHeader}>Description & Details</Text>
        <Text style={styles.descriptionText}>{resource.description}</Text>

        {/* Interactive Interest Box or Own Resource Tag */}
        {isOwnResource ? (
          <View style={styles.ownNoticeBox}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="pin-outline" size={14} color={appColors.icon} style={{ marginRight: 4 }} />
              <Text style={styles.ownNoticeText}>This is your listed item.</Text>
            </View>
            <Pressable
              style={styles.editListingBtn}
              onPress={() => router.push(`/resources/edit/${resource.id}` as any)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="pencil-outline" size={14} color={appColors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.editListingBtnText}>Edit Listing</Text>
              </View>
            </Pressable>
          </View>
        ) : hasRequested ? (
          <View style={styles.alreadyRequestedCard}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <MaterialCommunityIcons name="check-circle" size={18} color={appColors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.alreadyRequestedTitle}>Request Sent</Text>
            </View>
            <Text style={styles.alreadyRequestedSub}>
              You have already sent an interest request to {resource.owner_name} for this item. Check your Interest Requests tab for updates.
            </Text>
            <Pressable
              style={styles.viewRequestsBtn}
              onPress={() => router.push("/(app)/resources/requests" as any)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={15} color={appColors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.viewRequestsBtnText}>View Interest Requests</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.interestCard}>
            <Text style={styles.interestTitle}>Want to acquire this item?</Text>
            <Text style={styles.interestSub}>
              Send a note to {resource.owner_name} to schedule a pickup or campus meetup.
            </Text>
            <TextInput
              style={styles.interestInput}
              placeholder="Hi! I'm interested in this book for CS-301. Are you on campus today?"
              placeholderTextColor={appColors.textMuted}
              value={interestMessage}
              onChangeText={setInterestMessage}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {requestMessage ? (
              <Text style={styles.feedbackMessage}>{requestMessage}</Text>
            ) : null}
            <Pressable
              style={[styles.interestBtn, isSendingRequest && styles.interestBtnDisabled]}
              onPress={() => void handleInterestRequest()}
              disabled={isSendingRequest}
            >
              {isSendingRequest ? (
                <ActivityIndicator color={appColors.black} />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons name="send-outline" size={15} color={appColors.black} style={{ marginRight: 5 }} />
                  <Text style={styles.interestBtnText}>Send Interest Request</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
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
    borderWidth: 1,
    borderColor: appColors.headerControlBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: appColors.onHeader,
  },
  container: {
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
    backgroundColor: appColors.background,
  },
  bannerImage: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    resizeMode: "cover",
    backgroundColor: appColors.border,
  },
  bannerPlaceholder: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerEmoji: {
    fontSize: 64,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  priceTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceTagFree: {
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  priceTagPaid: {
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.amber200,
  },
  priceTagText: {
    fontSize: 12,
    fontWeight: "800",
  },
  priceTagTextFree: {
    color: appColors.icon,
  },
  priceTagTextPaid: {
    color: appColors.icon,
  },
  conditionTag: {
    backgroundColor: appColors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  conditionTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: appColors.textSecondary,
  },
  title: {
    color: appColors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  infoCard: {
    backgroundColor: appColors.white,
    borderColor: appColors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  infoLabel: {
    color: appColors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 1,
  },
  infoValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 1,
    marginLeft: 8,
  },
  infoValue: {
    color: appColors.text,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
    flexShrink: 1,
    textAlign: "right",
  },
  sectionHeader: {
    color: appColors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  descriptionText: {
    color: appColors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: appColors.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  ownNoticeBox: {
    backgroundColor: appColors.border,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  ownNoticeText: {
    color: appColors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  editListingBtn: {
    backgroundColor: appColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editListingBtnText: {
    color: appColors.gold,
    fontWeight: "800",
    fontSize: 13,
  },
  alreadyRequestedCard: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.green200,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  alreadyRequestedTitle: {
    color: appColors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  alreadyRequestedSub: {
    color: appColors.primary,
    fontSize: 13,
    lineHeight: 18,
  },
  viewRequestsBtn: {
    backgroundColor: appColors.white,
    borderColor: appColors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  viewRequestsBtnText: {
    color: appColors.primary,
    fontWeight: "800",
    fontSize: 13,
  },
  interestCard: {
    backgroundColor: appColors.white,
    borderColor: appColors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    marginTop: 8,
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  interestTitle: {
    color: appColors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  interestSub: {
    color: appColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  interestInput: {
    backgroundColor: appColors.background,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    padding: 12,
    color: appColors.text,
    fontSize: 13,
    minHeight: 80,
  },
  feedbackMessage: {
    color: appColors.icon,
    fontSize: 12,
    fontWeight: "700",
  },
  interestBtn: {
    backgroundColor: appColors.gold,
    borderRadius: 10,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  interestBtnDisabled: {
    opacity: 0.6,
  },
  interestBtnText: {
    color: appColors.black,
    fontWeight: "800",
    fontSize: 14,
  },
  errorText: {
    color: appColors.danger,
    fontSize: 14,
    textAlign: "center",
  },
});
