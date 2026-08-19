import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { API_BASE_URL } from "../../../core/network/apiClient";
import { deleteResourceListing, fetchMyResourceListings, updateResourceListingStatus } from "../data/resourcesApi";
import type { ResourceListing, ResourceStatus } from "../resources";

function getImageUrl(imagePath: string | null) {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const host = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${host}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

const statusOptions: { value: ResourceStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "reserved", label: "Reserved" },
  { value: "unavailable", label: "Unavailable" },
];

export default function MyListingsScreen() {
  const [listings, setListings] = useState<ResourceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadListings = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetchMyResourceListings();
      setListings(response.results);
    } catch {
      setErrorMessage("Could not load your listings.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { void loadListings(); }, []);

  const changeStatus = async (id: number, status: ResourceStatus) => {
    setUpdatingId(id);
    try {
      await updateResourceListingStatus(id, status);
      await loadListings();
    } catch {
      setErrorMessage("Could not update this listing.");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteListing = (listing: ResourceListing) => {
    Alert.alert(
      "Delete listing?",
      `Delete “${listing.title}”? This cannot be undone.`,
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

  const renderItem = useCallback(({ item: listing }: { item: ResourceListing }) => {
    const thumb = getImageUrl(listing.image);
    return (
      <View style={styles.card}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.cardThumb} />
        ) : null}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{listing.title}</Text>
          <Text style={styles.meta}>{listing.category.replace("_", " ")} · {listing.condition}</Text>
          <View style={styles.listingActions}>
            <Pressable style={styles.editButton} onPress={() => router.push(`/resources/edit/${listing.id}`)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={() => deleteListing(listing)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
          <Text style={styles.statusLabel}>Availability</Text>
          {updatingId === listing.id ? <ActivityIndicator color="#1d4ed8" /> : (
            <View style={styles.statuses}>
              {statusOptions.map((option) => (
                <Pressable key={option.value} style={[styles.statusButton, listing.status === option.value && styles.selectedStatus]} onPress={() => void changeStatus(listing.id, option.value)}>
                  <Text style={[styles.statusText, listing.status === option.value && styles.selectedStatusText]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }, [updatingId]);

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1d4ed8" /></View>;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}><Text style={styles.backLink}>← My Resources</Text></Pressable>
      <View style={styles.header}>
        <Text style={styles.title}>My Listings</Text>
        <Pressable style={styles.addButton} onPress={() => router.push("/resources/create")}><Text style={styles.addButtonText}>Add listing</Text></Pressable>
      </View>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        data={listings}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefreshing}
        onRefresh={() => void loadListings(true)}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
        contentContainerStyle={listings.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>You have not added a listing yet.</Text>}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flex: 1, padding: 20, paddingTop: 56, paddingBottom: 20 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  backLink: { color: "#1d4ed8", fontWeight: "700", marginBottom: 20 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  title: { color: "#0f172a", fontSize: 26, fontWeight: "700" },
  addButton: { backgroundColor: "#1d4ed8", borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 },
  addButtonText: { color: "#ffffff", fontWeight: "700" },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  cardThumb: { width: "100%", height: 140, resizeMode: "cover" },
  cardContent: { padding: 16, gap: 9 },
  cardTitle: { color: "#0f172a", fontSize: 17, fontWeight: "700" },
  meta: { color: "#64748b", textTransform: "capitalize" },
  listingActions: { flexDirection: "row", gap: 10 },
  editButton: { backgroundColor: "#dbeafe", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 8 },
  editButtonText: { color: "#1d4ed8", fontWeight: "700" },
  deleteButton: { borderColor: "#b91c1c", borderRadius: 7, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  deleteButtonText: { color: "#b91c1c", fontWeight: "700" },
  statusLabel: { color: "#334155", fontWeight: "700", marginTop: 4 },
  statuses: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusButton: { borderColor: "#cbd5e1", borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  selectedStatus: { backgroundColor: "#dbeafe", borderColor: "#1d4ed8" },
  statusText: { color: "#475569" },
  selectedStatusText: { color: "#1d4ed8", fontWeight: "700" },
  emptyText: { color: "#64748b", textAlign: "center" },
  errorText: { color: "#b91c1c", marginBottom: 12 },
});

