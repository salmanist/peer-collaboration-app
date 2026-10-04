import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
import { SkeletonList, LostAndFoundCardSkeleton } from "../../../core/components/Skeleton";
import { ModuleOptionsMenu, type ModuleDropdownItem } from "../../../core/components/ModuleOptionsMenu";
import { API_BASE_URL } from "../../../core/network/apiClient";
import { useDataStore } from "../../../core/store/DataStoreContext";
import { fetchLostAndFoundItems } from "../data/lostAndFoundApi";
import {
  LOST_AND_FOUND_CATEGORIES,
  type LostAndFoundCategory,
  type LostAndFoundItem,
  type LostAndFoundPostType,
} from "../lostAndFound";
import { useLostAndFoundNotificationStore } from "../lostAndFoundNotifications";

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

export default function LostAndFoundFeedScreen() {
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const markItemsSeen = useLostAndFoundNotificationStore((state) => state.markItemsSeen);
  const hasNewClaims = useLostAndFoundNotificationStore((state) => state.hasNewClaims);
  const hasNewItems = useLostAndFoundNotificationStore((state) => state.hasNewItems);

  const dropdownItems: ModuleDropdownItem[] = useMemo(
    () => [
      {
        key: "my_notices",
        label: "My Notices & Claims",
        subtitle: "Track your posted items & claims",
        icon: "clipboard-list-outline",
        iconColor: "#0D3E02",
        hasDot: hasNewClaims,
        onPress: () => router.push("/(app)/lost-and-found/my-notices" as any),
      },
    ],
    [hasNewClaims]
  );

  // In-Memory DataStore
  const { lostAndFoundItems: cachedItems, setLostAndFoundItems } = useDataStore();

  const [allLoadedItems, setAllLoadedItems] = useState<LostAndFoundItem[]>(() => cachedItems || []);
  const [postTypeFilter, setPostTypeFilter] = useState<LostAndFoundPostType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<LostAndFoundCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !(cachedItems && cachedItems.length > 0));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  // Instant 0ms In-Memory Filtering for ultra-responsive tab and category switching
  const displayItems = useMemo(() => {
    let list = allLoadedItems;
    if (postTypeFilter !== "all") {
      list = list.filter((i) => i.post_type === postTypeFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((i) => i.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          (i.title || "").toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q) ||
          (i.location || "").toLowerCase().includes(q) ||
          (i.poster_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [allLoadedItems, postTypeFilter, categoryFilter, searchQuery]);

  const loadItems = useCallback(
    async (targetPage: number = 1, shouldRefresh: boolean = false) => {
      try {
        if (targetPage === 1 && !shouldRefresh && !allLoadedItems.length && !cachedItems?.length) {
          setIsLoading(true);
        }
        if (targetPage > 1) setIsLoadingMore(true);

        const response = await fetchLostAndFoundItems({
          page: targetPage,
        });

        if (targetPage === 1) {
          setAllLoadedItems(response.results);
          setLostAndFoundItems(response.results);
        } else {
          setAllLoadedItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newUnique = response.results.filter((i) => !existingIds.has(i.id));
            return [...prev, ...newUnique];
          });
        }
        setPage(targetPage);
        setHasMore(Boolean(response.next));
        setErrorMessage("");
      } catch {
        setErrorMessage("Could not load lost & found notices. Please try again.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [allLoadedItems.length, cachedItems?.length, setLostAndFoundItems],
  );

  useEffect(() => {
    void loadItems(1);
    markItemsSeen();
  }, [loadItems, markItemsSeen]);

  const onRefresh = () => {
    setIsRefreshing(true);
    void loadItems(1, true);
  };

  const onEndReached = () => {
    if (!isLoading && !isLoadingMore && hasMore) {
      void loadItems(page + 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Compact Top App Bar */}
      <View style={[styles.compactTopNav, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Text style={styles.compactNavTitle}>Lost & Found</Text>
        <ModuleOptionsMenu
          items={dropdownItems}
          hasNotification={hasNewClaims || hasNewItems}
        />
      </View>

      {/* Search Bar Row */}
      <View style={styles.actionSearchRow}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items, student IDs, locations..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => void loadItems(1)}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable onPress={() => { setSearchQuery(""); void loadItems(1); }}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#94a3b8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Segment Tabs (All, Lost, Found) */}
      <View style={styles.segmentContainer}>
        <Pressable
          style={[styles.segmentBtn, postTypeFilter === "all" && styles.segmentBtnActive]}
          onPress={() => setPostTypeFilter("all")}
        >
          <Text style={[styles.segmentBtnText, postTypeFilter === "all" && styles.segmentBtnTextActive]}>
            All Notices
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, postTypeFilter === "lost" && styles.segmentBtnActive]}
          onPress={() => setPostTypeFilter("lost")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="magnify"
              size={14}
              color={postTypeFilter === "lost" ? "#0D3E02" : "#475569"}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.segmentBtnText, postTypeFilter === "lost" && styles.segmentBtnTextActive]}>
              Lost Items
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, postTypeFilter === "found" && styles.segmentBtnActive]}
          onPress={() => setPostTypeFilter("found")}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="package-variant"
              size={14}
              color={postTypeFilter === "found" ? "#0D3E02" : "#475569"}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.segmentBtnText, postTypeFilter === "found" && styles.segmentBtnTextActive]}>
              Found Items
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Category Pills Strip */}
      <View style={styles.categoriesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          <Pressable
            style={[styles.categoryBtn, categoryFilter === "all" && styles.categoryBtnActive]}
            onPress={() => setCategoryFilter("all")}
          >
            <Text style={[styles.categoryBtnLabel, categoryFilter === "all" && styles.categoryBtnLabelActive]}>All</Text>
          </Pressable>
          {LOST_AND_FOUND_CATEGORIES.map((cat) => {
            const isSelected = categoryFilter === cat.value;
            return (
              <Pressable
                key={cat.value}
                style={[styles.categoryBtn, isSelected && styles.categoryBtnActive]}
                onPress={() => setCategoryFilter(cat.value)}
              >
                <Text style={[styles.categoryBtnLabel, isSelected && styles.categoryBtnLabelActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Error Message */}
      {errorMessage ? (
        <View style={styles.messageBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void loadItems(1)}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Feed List */}
      {isLoading ? (
        <SkeletonList
          count={5}
          renderItem={() => <LostAndFoundCardSkeleton />}
          contentContainerStyle={[
            styles.feedList,
            { paddingBottom: Math.max(insets.bottom + 50, 70) },
          ]}
        />
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            displayItems.length === 0 ? styles.emptyList : styles.feedList,
            { paddingBottom: Math.max(insets.bottom + 80, 100) },
          ]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="magnify-close" size={48} color="#64748b" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No notices found</Text>
              <Text style={styles.emptySub}>
                No lost or found items match your filters. Tap the + button to add one!
              </Text>
            </View>
          }
          ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color="#0D3E02" style={{ marginVertical: 14 }} /> : null}
          renderItem={({ item }) => {
            const isLost = item.post_type === "lost";
            const imageUrl = getImageUrl(item.image);

            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/(app)/lost-and-found/${item.id}`)}
              >
                <View style={styles.cardThumbContainer}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cardThumbnail} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cardPlaceholder, isLost ? styles.placeholderLost : styles.placeholderFound]}>
                      <MaterialCommunityIcons
                        name={isLost ? "help-circle-outline" : "package-variant-closed"}
                        size={28}
                        color="#64748b"
                      />
                    </View>
                  )}
                  <View style={[styles.postTypeTag, isLost ? styles.tagLost : styles.tagFound]}>
                    <Text style={styles.postTypeTagText}>
                      {isLost ? "LOST" : "FOUND"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardCategory}>
                      {item.category.toUpperCase()}
                    </Text>
                    {item.status === "resolved" ? (
                      <View style={styles.resolvedTag}>
                        <Text style={styles.resolvedTagText}>RESOLVED</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                    <MaterialCommunityIcons name="map-marker" size={12} color="#64748b" style={{ marginRight: 3 }} />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {item.location || "LGU Campus"}
                    </Text>
                  </View>

                  {item.date_lost_or_found ? (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                      <MaterialCommunityIcons name="calendar-outline" size={12} color="#64748b" style={{ marginRight: 3 }} />
                      <Text style={styles.dateText}>
                        {item.date_lost_or_found}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.posterText} numberOfLines={1}>
                      Posted by: {item.poster_name || "LGU Student"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        style={[
          styles.floatingAddBtn,
          { bottom: Math.max(insets.bottom + 65, 80) },
        ]}
        onPress={() => router.push("/(app)/lost-and-found/create")}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#ffffff" />
      </Pressable>
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
    paddingBottom: 7,
  },
  myNoticesHeaderBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    justifyContent: "center",
    alignItems: "center",
  },
  hamburgerBtn: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hamburgerLine: {
    width: 17,
    height: 2,
    backgroundColor: "#0D3E02",
    borderRadius: 2,
  },
  compactNavTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0D3E02",
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
    backgroundColor: "#0D3E02",
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
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 11 : 7,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
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
    color: "#0F172A",
    fontWeight: "500",
  },
  clearSearch: {
    color: "#94a3b8",
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
    backgroundColor: "#0D3E02",
    borderWidth: 1.5,
    borderColor: "#0D3E02",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentBtnTextActive: {
    color: "#0D3E02",
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
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryBtnActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  categoryBtnLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  categoryBtnLabelActive: {
    color: "#FDBF1E",
    fontWeight: "800",
  },
  feedList: {
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
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardThumbContainer: {
    width: 110,
    backgroundColor: "#F1F5F9",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  cardThumbnail: {
    width: "100%",
    height: "100%",
  },
  cardPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderLost: {
    backgroundColor: "#FEE2E2",
  },
  placeholderFound: {
    backgroundColor: "#E8F5E9",
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  postTypeTag: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagLost: {
    backgroundColor: "#DC2626",
  },
  tagFound: {
    backgroundColor: "#0D3E02",
  },
  postTypeTagText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  cardContent: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  resolvedTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resolvedTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0D3E02",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#070D1F",
    lineHeight: 18,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 11,
    color: "#475569",
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 6,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F8FAF8",
    paddingTop: 6,
    marginTop: "auto",
  },
  posterText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  messageBox: {
    margin: 16,
    padding: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    alignItems: "center",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 12,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: "#b91c1c",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
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
    lineHeight: 18,
  },
});
