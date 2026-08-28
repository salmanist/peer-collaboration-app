import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useDataStore } from "../../../core/store/DataStoreContext";
import { SkeletonList, ResourceCardSkeleton } from "../../../core/components/Skeleton";
import {
  deletePublicResourceRequest,
  deleteResourceListing,
  fetchMyPublicResourceRequests,
  fetchMyResourceListings,
  updatePublicResourceRequestStatus,
  updateResourceListing,
} from "../data/resourcesApi";
import type {
  PublicResourceRequest,
  PublicResourceRequestStatus,
  ResourceCategory,
  ResourceListing,
  ResourceStatus,
} from "../resources";

function getImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
  return `${baseUrl.replace(/\/$/, "")}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

function getCategoryIconName(category: ResourceCategory): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (category) {
    case "books": return "book-open-page-variant";
    case "notes": return "file-document-edit-outline";
    case "stationery": return "ruler-square";
    case "lab_equipment": return "flask-outline";
    default: return "package-variant-closed";
  }
}

function getCategoryBg(category: ResourceCategory): string {
  switch (category) {
    case "books": return "#E8F5E9";
    case "notes": return "#FEF3C7";
    case "stationery": return "#E0F2FE";
    case "lab_equipment": return "#FCE7F3";
    default: return "#F1F5F9";
  }
}

function getExchangeLabel(listing: ResourceListing): string {
  if (listing.exchange_type === "free") return "FREE";
  if (listing.exchange_type === "sell") return `PKR ${listing.price || 0}`;
  if (listing.exchange_type === "lend") return "Lend / Borrow";
  if (listing.exchange_type === "rent") return `Rent: PKR ${listing.price || 0}`;
  if (listing.exchange_type === "exchange") return "Exchange";
  return "Available";
}

const statusOptions: { label: string; value: ResourceStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Reserved", value: "reserved" },
  { label: "Unavailable", value: "unavailable" },
];

export default function MyListingsScreen() {
  const insets = useSafeAreaInsets();
  const { myResourceListings: cachedListings, setMyResourceListings } = useDataStore();
  const [activeTab, setActiveTab] = useState<"listings" | "requests">("listings");

  // Listings State
  const [listings, setListings] = useState<ResourceListing[]>(() => cachedListings || []);
  const [isListingsLoading, setIsListingsLoading] = useState(() => !cachedListings);
  const [isListingsRefreshing, setIsListingsRefreshing] = useState(false);
  const [updatingListingId, setUpdatingListingId] = useState<number | null>(null);

  // Requests State
  const [requests, setRequests] = useState<PublicResourceRequest[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);
  const [isRequestsRefreshing, setIsRequestsRefreshing] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  const loadListings = useCallback(async (refresh = false) => {
    if (refresh) setIsListingsRefreshing(true);
    else if (!listings.length && !cachedListings?.length) setIsListingsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetchMyResourceListings(1);
      setListings(response.results);
      setMyResourceListings(response.results);
    } catch {
      setErrorMessage("Could not load your listings.");
    } finally {
      setIsListingsLoading(false);
      setIsListingsRefreshing(false);
    }
  }, [listings.length, cachedListings, setMyResourceListings]);

  const loadRequests = useCallback(async (refresh = false) => {
    if (refresh) setIsRequestsRefreshing(true);
    else if (!requests.length) setIsRequestsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetchMyPublicResourceRequests();
      setRequests(response.results);
    } catch {
      setErrorMessage("Could not load your requests.");
    } finally {
      setIsRequestsLoading(false);
      setIsRequestsRefreshing(false);
    }
  }, [requests.length]);

  useEffect(() => {
    void loadListings();
    void loadRequests();
  }, [loadListings, loadRequests]);

  const changeListingStatus = async (id: number, status: ResourceStatus) => {
    setUpdatingListingId(id);
    try {
      await updateResourceListing(id, { status });
      await loadListings();
    } catch {
      setErrorMessage("Could not update listing status.");
    } finally {
      setUpdatingListingId(null);
    }
  };

  const deleteListing = (listing: ResourceListing) => {
    Alert.alert(
      "Delete Listing?",
      `Are you sure you want to delete "${listing.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteResourceListing(listing.id);
                await loadListings();
              } catch {
                setErrorMessage("Could not delete this listing.");
              }
            })();
          },
        },
      ],
    );
  };

  const changeRequestStatus = async (id: number, status: PublicResourceRequestStatus) => {
    setUpdatingRequestId(id);
    try {
      await updatePublicResourceRequestStatus(id, status);
      await loadRequests();
    } catch {
      setErrorMessage("Could not update request status.");
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const deleteRequest = (request: PublicResourceRequest) => {
    Alert.alert(
      "Delete Request?",
      `Are you sure you want to delete "${request.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deletePublicResourceRequest(request.id);
                await loadRequests();
              } catch {
                setErrorMessage("Could not delete this request.");
              }
            })();
          },
        },
      ],
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/resources" as any);
    }
  };

  const renderListingItem = useCallback(
    ({ item: listing }: { item: ResourceListing }) => {
      const thumb = getImageUrl(listing.image);
      const isFree = listing.exchange_type === "free";

      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.cardThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.cardThumbPlaceholder, { backgroundColor: getCategoryBg(listing.category) }]}>
                <MaterialCommunityIcons name={getCategoryIconName(listing.category)} size={28} color="#64748b" />
              </View>
            )}

            <View style={styles.cardInfo}>
              <View style={styles.badgeRow}>
                <View style={[styles.priceTag, isFree ? styles.priceTagFree : styles.priceTagPaid]}>
                  <Text style={[styles.priceTagText, isFree ? styles.priceTagTextFree : styles.priceTagTextPaid]}>
                    {getExchangeLabel(listing)}
                  </Text>
                </View>
                {listing.condition ? (
                  <View style={styles.conditionTag}>
                    <Text style={styles.conditionTagText}>{listing.condition.replace("_", " ")}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.cardTitle} numberOfLines={2}>
                {listing.title}
              </Text>

              <View style={styles.metaRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name={getCategoryIconName(listing.category)} size={12} color="#64748b" style={{ marginRight: 3 }} />
                  <Text style={styles.categoryMetaText}>
                    {listing.category.replace("_", " ")}
                  </Text>
                </View>
                {listing.course ? (
                  <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 6 }}>
                    <Text style={{ color: "#64748b", marginRight: 4 }}>•</Text>
                    <MaterialCommunityIcons name="target" size={12} color="#64748b" style={{ marginRight: 2 }} />
                    <Text style={styles.courseMetaText} numberOfLines={1}>
                      {listing.course}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.cardActionsRow}>
            <Pressable
              style={styles.editBtn}
              onPress={() => router.push(`/resources/edit/${listing.id}` as any)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="pencil-outline" size={14} color="#0D3E02" style={{ marginRight: 4 }} />
                <Text style={styles.editBtnText}>Edit</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.deleteBtn}
              onPress={() => deleteListing(listing)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#B91C1C" style={{ marginRight: 4 }} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </View>
            </Pressable>
          </View>

          {/* Status Controls */}
          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>Availability Status:</Text>
            {updatingListingId === listing.id ? (
              <ActivityIndicator size="small" color="#0D3E02" />
            ) : (
              <View style={styles.statusPillsRow}>
                {statusOptions.map((option) => {
                  const isSelected = listing.status === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.statusPill,
                        isSelected && styles.statusPillSelected,
                      ]}
                      onPress={() => void changeListingStatus(listing.id, option.value)}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isSelected && styles.statusPillTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      );
    },
    [updatingListingId],
  );

  const renderRequestItem = useCallback(
    ({ item: request }: { item: PublicResourceRequest }) => {
      const isOpen = request.status === "open";
      const isFulfilled = request.status === "fulfilled";

      return (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {request.title}
            </Text>
            <View
              style={[
                styles.statusBadge,
                isOpen
                  ? styles.statusOpen
                  : isFulfilled
                  ? styles.statusFulfilled
                  : styles.statusCancelled,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isOpen
                    ? styles.statusOpenText
                    : isFulfilled
                    ? styles.statusFulfilledText
                    : styles.statusCancelledText,
                ]}
              >
                {request.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {request.description ? (
            <Text style={styles.descriptionText}>"{request.description}"</Text>
          ) : null}

          {request.course ? (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <MaterialCommunityIcons name="target" size={13} color="#0D3E02" style={{ marginRight: 4 }} />
              <Text style={styles.courseTag}>Course: {request.course}</Text>
            </View>
          ) : null}

          {/* Action Buttons Row */}
          <View style={styles.cardActionsRow}>
            {isOpen ? (
              <>
                <Pressable
                  style={styles.fulfillBtn}
                  onPress={() => void changeRequestStatus(request.id, "fulfilled")}
                  disabled={updatingRequestId === request.id}
                >
                  {updatingRequestId === request.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                      <MaterialCommunityIcons name="check-circle-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.fulfillBtnText}>Mark Fulfilled</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  style={styles.editBtn}
                  onPress={() => router.push(`/resources/wanted/edit/${request.id}` as any)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name="pencil-outline" size={14} color="#0D3E02" style={{ marginRight: 4 }} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </View>
                </Pressable>
              </>
            ) : null}
            <Pressable
              style={styles.deleteBtn}
              onPress={() => deleteRequest(request)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#B91C1C" style={{ marginRight: 4 }} />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </View>
            </Pressable>
          </View>
        </View>
      );
    },
    [updatingRequestId],
  );

  return (
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset + 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={handleBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>
          {activeTab === "listings" ? "My Shared Listings" : "My Resource Requests"}
        </Text>
        <View style={styles.navSpacer} />
      </View>

      {/* Segmented Switcher Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === "listings" && styles.activeTab]}
          onPress={() => setActiveTab("listings")}
        >
          <View style={styles.tabContentRow}>
            <MaterialCommunityIcons
              name="package-variant"
              size={16}
              color={activeTab === "listings" ? "#FDBF1E" : "#475569"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === "listings" && styles.activeTabText]}>
              My Listings ({listings.length})
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "requests" && styles.activeTab]}
          onPress={() => setActiveTab("requests")}
        >
          <View style={styles.tabContentRow}>
            <MaterialCommunityIcons
              name="hand-wave-outline"
              size={16}
              color={activeTab === "requests" ? "#FDBF1E" : "#475569"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === "requests" && styles.activeTabText]}>
              My Requests ({requests.length})
            </Text>
          </View>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 4 }} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Tab 1: Listings Content */}
      {activeTab === "listings" ? (
        isListingsLoading ? (
          <SkeletonList
            count={4}
            renderItem={() => <ResourceCardSkeleton />}
            contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
          />
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => String(item.id)}
            refreshing={isListingsRefreshing}
            onRefresh={() => void loadListings(true)}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
            contentContainerStyle={[
              listings.length === 0 ? styles.emptyList : styles.list,
              { paddingBottom: Math.max(insets.bottom + 40, 60) },
            ]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="package-variant-closed" size={48} color="#64748b" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Listings Yet</Text>
                <Text style={styles.emptySub}>
                  You haven't listed any textbooks, notes, or gear yet.
                </Text>
                <Pressable
                  style={styles.emptyAddBtn}
                  onPress={() => router.push("/(app)/resources/create" as any)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons name="plus" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.emptyAddBtnText}>Share New Item</Text>
                  </View>
                </Pressable>
              </View>
            }
            renderItem={renderListingItem}
          />
        )
      ) : (
        /* Tab 2: Requests Content */
        isRequestsLoading ? (
          <SkeletonList
            count={4}
            renderItem={() => <ResourceCardSkeleton />}
            contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
          />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => String(item.id)}
            refreshing={isRequestsRefreshing}
            onRefresh={() => void loadRequests(true)}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
            contentContainerStyle={[
              requests.length === 0 ? styles.emptyList : styles.list,
              { paddingBottom: Math.max(insets.bottom + 40, 60) },
            ]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="hand-wave-outline" size={48} color="#64748b" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Requests Posted</Text>
                <Text style={styles.emptySub}>
                  You haven't posted any resource requests yet.
                </Text>
                <Pressable
                  style={styles.emptyAddBtn}
                  onPress={() => router.push("/(app)/resources/wanted/create" as any)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons name="plus" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.emptyAddBtnText}>Post New Request</Text>
                  </View>
                </Pressable>
              </View>
            }
            renderItem={renderRequestItem}
          />
        )
      )}

      {/* Floating Action Button */}
      <Pressable
        style={[
          styles.floatingActionBtn,
          { bottom: Math.max(insets.bottom + 20, 24) },
        ]}
        onPress={() =>
          activeTab === "listings"
            ? router.push("/(app)/resources/create" as any)
            : router.push("/(app)/resources/wanted/create" as any)
        }
      >
        <MaterialCommunityIcons name="plus" size={18} color="#FDBF1E" />
        <Text style={styles.floatingActionBtnText}>
          {activeTab === "listings" ? "Share Item" : "Post Request"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
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
  navSpacer: {
    width: 36,
  },
  floatingActionBtn: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D3E02",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: "#FDBF1E",
  },
  floatingActionBtnIcon: {
    color: "#FDBF1E",
    fontSize: 16,
    fontWeight: "900",
  },
  floatingActionBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  tabContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  activeTabText: {
    color: "#0D3E02",
    fontWeight: "800",
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  list: {
    padding: 16,
    gap: 14,
  },
  emptyList: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#F1F5F9",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardThumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  cardThumbPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderEmoji: {
    fontSize: 30,
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  priceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  priceTagFree: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderWidth: 1,
  },
  priceTagPaid: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
  },
  priceTagText: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
  priceTagTextFree: {
    color: "#15803D",
  },
  priceTagTextPaid: {
    color: "#92400E",
  },
  conditionTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  conditionTagText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
    textAlign: "center",
    includeFontPadding: false,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#070D1F",
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  categoryMetaText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  courseMetaText: {
    color: "#0D3E02",
    fontSize: 11,
    fontWeight: "700",
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  fulfillBtn: {
    flex: 1,
    backgroundColor: "#0D3E02",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fulfillBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },
  editBtn: {
    flex: 1,
    backgroundColor: "#E8F5E9",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  editBtnText: {
    color: "#0D3E02",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  deleteBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },
  statusSection: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
    gap: 6,
  },
  statusLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
  },
  statusPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusPillSelected: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
    includeFontPadding: false,
  },
  statusPillTextSelected: {
    color: "#FDBF1E",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
  statusOpen: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderWidth: 1,
  },
  statusOpenText: {
    color: "#15803D",
  },
  statusFulfilled: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
  },
  statusFulfilledText: {
    color: "#1E40AF",
  },
  statusCancelled: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
  },
  statusCancelledText: {
    color: "#DC2626",
  },
  descriptionText: {
    color: "#475569",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 16,
  },
  courseTag: {
    color: "#0D3E02",
    fontSize: 11,
    fontWeight: "700",
  },
  errorBox: {
    margin: 16,
    padding: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 12,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#070D1F",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyAddBtn: {
    backgroundColor: "#0D3E02",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    color: "#FDBF1E",
    fontWeight: "800",
    fontSize: 13,
  },
});
