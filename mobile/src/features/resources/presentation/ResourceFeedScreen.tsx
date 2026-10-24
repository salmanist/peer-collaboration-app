import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

import {
  fetchMyPublicResourceOffers,
  fetchPublicResourceRequests,
  fetchResourceListings,
} from "../data/resourcesApi";
import { useSessionStore } from "../../../core/auth/session";
import { API_BASE_URL } from "../../../core/network/apiClient";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { ResourceCardSkeleton, SkeletonList } from "../../../core/components/Skeleton";
import { ModuleOptionsMenu, type ModuleDropdownItem } from "../../../core/components/ModuleOptionsMenu";
import { useResourceNotificationStore } from "../resourceNotifications";
import type {
  PublicResourceOffer,
  PublicResourceRequest,
  ResourceCategory,
  ResourceListing,
} from "../resources";

type UnifiedMarketplaceItem =
  | ({ itemType: "listing" } & ResourceListing)
  | ({ itemType: "request" } & PublicResourceRequest);

function getImageUrl(imagePath: string | null) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const host = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${host}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

function getExchangeLabel(listing: ResourceListing) {
  if (listing.exchange_type === "free") return "Free";
  if (listing.exchange_type === "sell" && listing.price) {
    return `Rs. ${listing.price}`;
  }
  if (listing.exchange_type === "rent" && listing.price) {
    return `Rent: Rs. ${listing.price}`;
  }
  return listing.exchange_type.replace("_", " ").toUpperCase();
}

function getDesiredExchangeLabel(desiredType: string) {
  switch (desiredType) {
    case "free":
      return "Looking for Free";
    case "sell":
      return "Looking to Buy";
    case "lend":
    case "borrow":
      return "Looking to Borrow";
    case "rent":
      return "Looking to Rent";
    case "exchange":
      return "Looking to Exchange";
    default:
      return `Looking for ${desiredType.toUpperCase()}`;
  }
}

const CATEGORIES: { id: ResourceCategory | "all"; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: "all", label: "All Items", icon: "creation" },
  { id: "books", label: "Textbooks", icon: "book-open-page-variant" },
  { id: "notes", label: "Course Notes", icon: "file-document-edit-outline" },
  { id: "lab_equipment", label: "Lab Gear", icon: "flask-outline" },
  { id: "stationery", label: "Stationery", icon: "ruler-square" },
  { id: "other", label: "Other", icon: "package-variant-closed" },
];

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

export default function ResourceFeedScreen() {
  const insets = useSafeAreaInsets();

  // In-Memory DataStore Context
  const {
    resourceListings: cachedListings,
    setResourceListings,
    publicResourceRequests: cachedRequests,
    setPublicResourceRequests,
    myResourceOffers: cachedOffers,
    setMyResourceOffers,
  } = useDataStore();

  const [listings, setListings] = useState<ResourceListing[]>(() => cachedListings || []);
  const [requests, setRequests] = useState<PublicResourceRequest[]>(() => cachedRequests || []);
  const [myOffers, setMyOffers] = useState<PublicResourceOffer[]>(() => cachedOffers || []);

  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(() => {
    return !(
      (cachedListings && cachedListings.length > 0) ||
      (cachedRequests && cachedRequests.length > 0)
    );
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const user = useSessionStore((state) => state.user);
  const markResourcesRead = useResourceNotificationStore((state) => state.markResourcesRead);
  const hasNewInterestRequests = useResourceNotificationStore((state) => state.hasNewInterestRequests);
  const hasNewResources = useResourceNotificationStore((state) => state.hasNewResources);

  const dropdownItems: ModuleDropdownItem[] = useMemo(
    () => [
      {
        key: "my_listings",
        label: "My Listings & Requests",
        subtitle: "Manage your posted items",
        icon: "format-list-bulleted",
        iconColor: appColors.primary,
        onPress: () => router.push("/(app)/resources/my-listings" as any),
      },
      {
        key: "interest_requests",
        label: "Interest Requests",
        subtitle: "Buyer requests for your items",
        icon: "hand-coin-outline",
        iconColor: appColors.icon,
        hasDot: hasNewInterestRequests,
        onPress: () => router.push("/(app)/resources/requests" as any),
      },
    ],
    [hasNewInterestRequests]
  );

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  const loadData = useCallback(
    async (
      cat: ResourceCategory | "all" = selectedCategory,
      search: string = searchQuery,
      isRefresh: boolean = false,
    ) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        const hasExisting = (listings.length > 0 || Boolean(cachedListings && cachedListings.length > 0)) ||
                            (requests.length > 0 || Boolean(cachedRequests && cachedRequests.length > 0));
        if (!hasExisting) {
          setIsLoading(true);
        }
      }

      setErrorMessage("");

      try {
        const [listingsResponse, requestsResponse, offersResponse] = await Promise.all([
          fetchResourceListings({
            status: "active",
            category: cat === "all" ? undefined : cat,
            search: search.trim() ? search.trim() : undefined,
          }),
          fetchPublicResourceRequests({
            category: cat === "all" ? undefined : cat,
            search: search.trim() ? search.trim() : undefined,
          }),
          fetchMyPublicResourceOffers().catch(() => ({ results: [] })),
        ]);

        setListings(listingsResponse.results);
        setRequests(requestsResponse.results);
        setMyOffers(offersResponse.results || []);

        if (cat === "all" && !search.trim()) {
          setResourceListings(listingsResponse.results);
          setPublicResourceRequests(requestsResponse.results);
          setMyResourceOffers(offersResponse.results || []);
        }

        if (user) void markResourcesRead(user.id);
      } catch {
        setErrorMessage("Could not load marketplace feed. Please try again.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedCategory, searchQuery, user, markResourcesRead, setResourceListings, setPublicResourceRequests, setMyResourceOffers],
  );

  // Check store first on mount / filter change
  useEffect(() => {
    const isDefault = selectedCategory === "all" && !searchQuery.trim();
    if (cachedListings && cachedListings.length > 0 && isDefault) {
      setListings(cachedListings);
    }
    if (cachedRequests && cachedRequests.length > 0 && isDefault) {
      setRequests(cachedRequests);
    }
    if (cachedOffers && isDefault) {
      setMyOffers(cachedOffers);
    }
    void loadData(selectedCategory, searchQuery);
  }, [selectedCategory]);

  const onRefresh = () => {
    void loadData(selectedCategory, searchQuery, true);
  };

  const handleSearchSubmit = () => {
    void loadData(selectedCategory, searchQuery);
  };

  // Unified combined items list sorted newest first
  const unifiedItems: UnifiedMarketplaceItem[] = useMemo(() => {
    const combined: UnifiedMarketplaceItem[] = [
      ...listings.map((l) => ({ ...l, itemType: "listing" as const })),
      ...requests.map((r) => ({ ...r, itemType: "request" as const })),
    ];
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined;
  }, [listings, requests]);

  const renderUnifiedItem = useCallback(
    ({ item }: { item: UnifiedMarketplaceItem }) => {
      if (item.itemType === "listing") {
        const thumbUrl = getImageUrl(item.image);
        const isFree = item.exchange_type === "free";

        return (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/resources/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              {/* Left Thumbnail */}
              {thumbUrl ? (
                <Image source={{ uri: thumbUrl }} style={styles.cardThumb} resizeMode="cover" />
              ) : (
                <View style={styles.cardThumbPlaceholder}>
                  <MaterialCommunityIcons name={getCategoryIconName(item.category)} size={28} color={appColors.textSecondary} />
                </View>
              )}

              {/* Right Content */}
              <View style={styles.cardInfo}>
                {/* Badges Row */}
                <View style={styles.badgeRow}>
                  {/* Share / Available badge with Price */}
                  <View style={[styles.priceTag, isFree ? styles.priceTagFree : styles.priceTagPaid]}>
                    <Text style={[styles.priceTagText, isFree ? styles.priceTagTextFree : styles.priceTagTextPaid]}>
                      {getExchangeLabel(item)}
                    </Text>
                  </View>

                  {/* Condition Tag */}
                  {item.condition ? (
                    <View style={styles.conditionTag}>
                      <Text style={styles.conditionTagText}>
                        {item.condition.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Title */}
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                {/* Category & Course Tag */}
                <View style={styles.metaRow}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons name={getCategoryIconName(item.category)} size={12} color={appColors.textSecondary} style={{ marginRight: 3 }} />
                    <Text style={styles.categoryMetaText}>
                      {item.category.replace("_", " ")}
                    </Text>
                  </View>
                  {item.course ? (
                    <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 6 }}>
                      <Text style={{ color: appColors.textSecondary, marginRight: 4 }}>•</Text>
                      <MaterialCommunityIcons name="target" size={12} color={appColors.primary} style={{ marginRight: 2 }} />
                      <Text style={styles.courseMetaText} numberOfLines={1}>
                        {item.course}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Student Attribution Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.ownerWrap}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="account-outline" size={13} color={appColors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.ownerName} numberOfLines={1}>
                    {item.owner_name || "LGU Student"}
                    {item.owner_department
                      ? ` (${item.owner_department}${item.owner_enrollment_year ? ` • ${item.owner_enrollment_year}` : ""})`
                      : ""}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        );
      }

      // Render Request Item
      const request = item;
      const isMine = request.requester_id === user?.id;
      const existingOffer = myOffers.find((offer) => offer.public_request_id === request.id);

      return (
        <Pressable style={styles.card} onPress={() => router.push(`/resources/wanted/${request.id}` as any)}>
          <View style={styles.cardHeader}>
            {/* Category Placeholder Icon */}
            <View style={styles.cardThumbPlaceholder}>
              <MaterialCommunityIcons name={getCategoryIconName(request.category)} size={28} color={appColors.textSecondary} />
            </View>

            {/* Right Content */}
            <View style={styles.cardInfo}>
              {/* Badges Row */}
              <View style={styles.badgeRow}>
                <View style={styles.wantedBadge}>
                  <Text style={styles.wantedBadgeText}>
                    {getDesiredExchangeLabel(request.desired_exchange_type)}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.cardTitle} numberOfLines={2}>
                {request.title}
              </Text>

              {/* Category & Course */}
              <View style={styles.metaRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name={getCategoryIconName(request.category)} size={12} color={appColors.textSecondary} style={{ marginRight: 3 }} />
                  <Text style={styles.categoryMetaText}>
                    {request.category.replace("_", " ")}
                  </Text>
                </View>
                {request.course ? (
                  <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 6 }}>
                    <Text style={{ color: appColors.textSecondary, marginRight: 4 }}>•</Text>
                    <MaterialCommunityIcons name="target" size={12} color={appColors.primary} style={{ marginRight: 2 }} />
                    <Text style={styles.courseMetaText} numberOfLines={1}>
                      {request.course}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Description */}
          {request.description ? (
            <Text style={styles.requestDescription} numberOfLines={3}>
              "{request.description}"
            </Text>
          ) : null}

          {/* Student Attribution & Actions Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.ownerWrap}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="account-outline" size={13} color={appColors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.ownerName} numberOfLines={1}>
                  {request.requester_name || "LGU Student"}
                  {request.requester_department
                    ? ` (${request.requester_department}${request.requester_enrollment_year ? ` • ${request.requester_enrollment_year}` : ""})`
                    : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Action Row */}
          <View style={styles.requestActionRow}>
            {isMine ? (
              <View style={styles.ownRequestTag}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="pin-outline" size={13} color={appColors.icon} style={{ marginRight: 3 }} />
                  <Text style={styles.ownRequestTagText}>Your Posted Request</Text>
                </View>
              </View>
            ) : existingOffer ? (
              <View style={styles.offerSentTag}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons name="check-circle" size={13} color={appColors.primary} style={{ marginRight: 3 }} />
                  <Text style={styles.offerSentTagText}>
                    Offer Sent: {existingOffer.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.fulfillBtn}
                onPress={() => router.push(`/resources/wanted/offer/${request.id}` as any)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <MaterialCommunityIcons name="hand-heart-outline" size={15} color={appColors.white} style={{ marginRight: 5 }} />
                  <Text style={styles.fulfillBtnText}>I Have This / Send Offer</Text>
                </View>
              </Pressable>
            )}
          </View>
        </Pressable>
      );
    },
    [myOffers, user?.id],
  );

  return (
    <View style={styles.container}>
      {/* Compact Top App Bar */}
      <View style={[styles.compactTopNav, { paddingTop: topOffset > 0 ? topOffset : 4 }]}>
        <Text style={styles.compactNavTitle}>Marketplace</Text>
        <ModuleOptionsMenu
          items={dropdownItems}
          hasNotification={hasNewInterestRequests || hasNewResources}
        />
      </View>

      {/* Search Bar Row */}
      <View style={styles.actionSearchRow}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color={appColors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search textbooks, notes, gear, requests..."
            placeholderTextColor={appColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable
              onPress={() => {
                setSearchQuery("");
                void loadData(selectedCategory, "");
              }}
            >
              <MaterialCommunityIcons name="close-circle" size={16} color={appColors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Clean Single Category Pills Strip */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[styles.categoryBtn, isSelected && styles.categoryBtnActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <MaterialCommunityIcons
                  name={cat.icon}
                  size={14}
                  color={isSelected ? appColors.gold : appColors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.categoryBtnLabel, isSelected && styles.categoryBtnLabelActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Unified Feed List */}
      {isLoading ? (
        <SkeletonList count={4} renderItem={() => <ResourceCardSkeleton />} />
      ) : errorMessage ? (
        <View style={styles.messageBox}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.red700} style={{ marginRight: 4 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
          <Pressable style={styles.retryBtn} onPress={() => void loadData()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={unifiedItems}
          keyExtractor={(item) => `${item.itemType}-${item.id}`}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={[
            unifiedItems.length === 0 ? styles.emptyList : styles.list,
            { paddingBottom: Math.max(insets.bottom + 80, 100) },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant-closed" size={48} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Marketplace Items Found</Text>
              <Text style={styles.emptySub}>
                {selectedCategory !== "all" || searchQuery
                  ? "Try changing your search filter or category."
                  : "Be the first student to share or request items on campus!"}
              </Text>
            </View>
          }
          renderItem={renderUnifiedItem}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        style={[
          styles.floatingAddBtn,
          { bottom: Math.max(insets.bottom + 65, 80) },
        ]}
        onPress={() => router.push("/(app)/resources/create" as any)}
      >
        <MaterialCommunityIcons name="plus" size={28} color={appColors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  compactTopNav: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    backgroundColor: appColors.headerBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 4 + headerGrow,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: appColors.headerBg,
  },
  myListingsHeaderBtn: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  hamburgerBtn: {
    backgroundColor: appColors.background,
    borderRadius: 10,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  hamburgerLine: {
    width: 17,
    height: 2,
    backgroundColor: appColors.primary,
    borderRadius: 2,
  },
  compactNavTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: appColors.onHeader,
    letterSpacing: -0.3,
  },
  avatarBtn: {
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: appColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  actionSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 11 : 7,
    gap: 8,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: appColors.text,
    fontWeight: "500",
  },
  clearSearch: {
    color: appColors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    padding: 4,
  },
  floatingAddBtn: {
    position: "absolute",
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: appColors.primary,
    borderWidth: 1.5,
    borderColor: appColors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  modeTabsContainer: {
    flexDirection: "row",
    backgroundColor: appColors.border,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  modeTabContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabActive: {
    backgroundColor: appColors.white,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.035,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.textSecondary,
    textAlign: "center",
    includeFontPadding: false,
  },
  modeTabTextActive: {
    color: appColors.primary,
    fontWeight: "800",
  },
  categoriesSection: {
    paddingVertical: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appColors.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.border,
    gap: 6,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryBtnActive: {
    backgroundColor: appColors.primary,
    borderColor: appColors.primary,
  },
  categoryBtnIcon: {
    fontSize: 12,
  },
  categoryBtnLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.textSecondary,
    textAlign: "center",
    includeFontPadding: false,
  },
  categoryBtnLabelActive: {
    color: appColors.gold,
    fontWeight: "800",
  },
  list: {
    padding: 16,
    paddingTop: 2,
    gap: 14,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 36,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 14,
  },
  cardThumb: {
    width: 92,
    height: 92,
    borderRadius: 14,
    backgroundColor: appColors.border,
  },
  cardThumbPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  cardInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  priceTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    fontSize: 11,
    fontWeight: "800",
  },
  priceTagTextFree: {
    color: appColors.icon,
  },
  priceTagTextPaid: {
    color: appColors.icon,
  },
  wantedBadge: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  wantedBadgeText: {
    color: appColors.blue800,
    fontSize: 11,
    fontWeight: "800",
  },
  conditionTag: {
    backgroundColor: appColors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conditionTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: appColors.textSecondary,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
    lineHeight: 18,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  categoryMetaText: {
    fontSize: 11,
    color: appColors.textSecondary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  courseMetaText: {
    fontSize: 11,
    color: appColors.primary,
    fontWeight: "700",
    flex: 1,
  },
  requestDescription: {
    fontSize: 12,
    color: appColors.textSecondary,
    fontStyle: "italic",
    backgroundColor: appColors.background,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingTop: 8,
    marginTop: 10,
  },
  ownerWrap: {
    flex: 1,
    marginRight: 8,
  },
  ownerName: {
    fontSize: 11,
    color: appColors.textSecondary,
    fontWeight: "600",
  },
  verifiedBadge: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  verifiedBadgeText: {
    color: appColors.primary,
    fontSize: 9,
    fontWeight: "800",
  },
  requestActionRow: {
    marginTop: 10,
  },
  ownRequestTag: {
    backgroundColor: appColors.border,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  ownRequestTagText: {
    color: appColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  offerSentTag: {
    backgroundColor: appColors.surfaceMuted,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  offerSentTagText: {
    color: appColors.icon,
    fontSize: 12,
    fontWeight: "800",
  },
  fulfillBtn: {
    backgroundColor: appColors.primary,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
  },
  fulfillBtnText: {
    color: appColors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  messageBox: {
    margin: 20,
    padding: 16,
    backgroundColor: appColors.dangerBg,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: appColors.red700,
    fontSize: 13,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: appColors.red700,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtnText: {
    color: appColors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 30,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
