import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { API_BASE_URL } from "../../../core/network/apiClient";
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
  const markItemsSeen = useLostAndFoundNotificationStore((state) => state.markItemsSeen);
  const [items, setItems] = useState<LostAndFoundItem[]>([]);
  const [postTypeFilter, setPostTypeFilter] = useState<LostAndFoundPostType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<LostAndFoundCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadItems = useCallback(
    async (targetPage: number = 1, shouldRefresh: boolean = false) => {
      try {
        if (targetPage === 1 && !shouldRefresh) setIsLoading(true);
        if (targetPage > 1) setIsLoadingMore(true);

        const response = await fetchLostAndFoundItems({
          post_type: postTypeFilter === "all" ? undefined : postTypeFilter,
          category: categoryFilter === "all" ? undefined : categoryFilter,
          search: searchQuery.trim() || undefined,
          page: targetPage,
        });

        if (targetPage === 1) {
          setItems(response.results);
        } else {
          setItems((prev) => {
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
    [postTypeFilter, categoryFilter, searchQuery],
  );

  useEffect(() => {
    markItemsSeen();
    void loadItems(1);
  }, [loadItems, markItemsSeen]);

  const onRefresh = () => {
    setIsRefreshing(true);
    markItemsSeen();
    void loadItems(1, true);
  };

  const onEndReached = () => {
    if (!isLoading && !isLoadingMore && hasMore) {
      void loadItems(page + 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Lost & Found</Text>
          <Text style={styles.subtitle}>Report or search lost and found items on campus</Text>
        </View>
        <Pressable style={styles.postButton} onPress={() => router.push("/(app)/lost-and-found/create")}>
          <Text style={styles.postButtonText}>+ Post Notice</Text>
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items, locations, descriptions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => void loadItems(1)}
          returnKeyType="search"
        />
      </View>

      {/* Post Type Segment Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, postTypeFilter === "all" && styles.tabItemActive]}
          onPress={() => setPostTypeFilter("all")}
        >
          <Text style={[styles.tabText, postTypeFilter === "all" && styles.tabTextActive]}>All Notices</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, postTypeFilter === "lost" && styles.tabItemActive]}
          onPress={() => setPostTypeFilter("lost")}
        >
          <Text style={[styles.tabText, postTypeFilter === "lost" && styles.tabTextActive]}>🔍 Lost Items</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, postTypeFilter === "found" && styles.tabItemActive]}
          onPress={() => setPostTypeFilter("found")}
        >
          <Text style={[styles.tabText, postTypeFilter === "found" && styles.tabTextActive]}>📦 Found Items</Text>
        </Pressable>
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
          <Pressable
            style={[styles.categoryPill, categoryFilter === "all" && styles.categoryPillActive]}
            onPress={() => setCategoryFilter("all")}
          >
            <Text style={[styles.categoryPillText, categoryFilter === "all" && styles.categoryPillTextActive]}>All</Text>
          </Pressable>
          {LOST_AND_FOUND_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              style={[styles.categoryPill, categoryFilter === cat.value && styles.categoryPillActive]}
              onPress={() => setCategoryFilter(cat.value)}
            >
              <Text style={[styles.categoryPillText, categoryFilter === cat.value && styles.categoryPillTextActive]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Error Message */}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {/* Feed List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={items.length === 0 ? styles.emptyList : styles.feedList}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔎</Text>
              <Text style={styles.emptyTitle}>No notices found</Text>
              <Text style={styles.emptySubtitle}>
                No lost or found items matched your search. Tap "+ Post Notice" to add one!
              </Text>
            </View>
          }
          ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color="#1d4ed8" style={styles.footerLoader} /> : null}
          renderItem={({ item }) => {
            const isLost = item.post_type === "lost";
            const imageUrl = getImageUrl(item.image);
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/(app)/lost-and-found/${item.id}`)}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.cardThumbnail} resizeMode="cover" />
                ) : (
                  <View style={[styles.cardPlaceholder, isLost ? styles.cardPlaceholderLost : styles.cardPlaceholderFound]}>
                    <Text style={styles.placeholderEmoji}>{isLost ? "❓" : "📦"}</Text>
                  </View>
                )}

                <View style={styles.cardContent}>
                  <View style={styles.cardTopRow}>
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
                  <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardPoster} numberOfLines={1}>Posted by {item.poster_name}</Text>
                    {item.claims_count > 0 ? (
                      <Text style={styles.claimsTag}>💬 {item.claims_count} claim{item.claims_count > 1 ? "s" : ""}</Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingTop: 56 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  postButton: { backgroundColor: "#1d4ed8", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  postButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  searchContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchInput: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  tabBar: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginVertical: 8 },
  tabItem: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#e2e8f0", alignItems: "center" },
  tabItemActive: { backgroundColor: "#1d4ed8" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  tabTextActive: { color: "#ffffff" },
  categoriesWrapper: { paddingVertical: 6 },
  categoriesList: { paddingHorizontal: 20, gap: 8 },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  categoryPillActive: { backgroundColor: "#1e293b", borderColor: "#1e293b" },
  categoryPillText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  categoryPillTextActive: { color: "#ffffff" },
  errorText: { color: "#b91c1c", paddingHorizontal: 20, paddingTop: 6, fontSize: 13 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  feedList: { padding: 20, gap: 14 },
  emptyList: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyContainer: { alignItems: "center", maxWidth: 300 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  emptySubtitle: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 4 },
  footerLoader: { marginVertical: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardThumbnail: { width: 110, height: 130 },
  cardPlaceholder: { width: 110, height: 130, justifyContent: "center", alignItems: "center" },
  cardPlaceholderLost: { backgroundColor: "#fee2e2" },
  cardPlaceholderFound: { backgroundColor: "#ecfdf5" },
  placeholderEmoji: { fontSize: 32 },
  cardContent: { flex: 1, padding: 12, justifyContent: "space-between" },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  typeBadgeLost: { backgroundColor: "#fee2e2" },
  typeBadgeFound: { backgroundColor: "#d1fae5" },
  typeBadgeText: { fontSize: 11, fontWeight: "800" },
  typeBadgeTextLost: { color: "#b91c1c" },
  typeBadgeTextFound: { color: "#047857" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusOpen: { backgroundColor: "#f1f5f9" },
  statusClosed: { backgroundColor: "#e2e8f0" },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  statusOpenText: { color: "#0284c7" },
  statusClosedText: { color: "#64748b" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginTop: 4 },
  cardLocation: { fontSize: 12, color: "#2563eb", fontWeight: "600", marginTop: 2 },
  cardDescription: { fontSize: 12, color: "#475569", marginTop: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  cardPoster: { fontSize: 11, color: "#94a3b8", flex: 1 },
  claimsTag: { fontSize: 11, color: "#6366f1", fontWeight: "700" },
});
