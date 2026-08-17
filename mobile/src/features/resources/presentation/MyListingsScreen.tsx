import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { deleteResourceListing, fetchMyResourceListings, updateResourceListingStatus } from "../data/resourcesApi";
import type { ResourceListing, ResourceStatus } from "../resources";

const statusOptions: { value: ResourceStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "reserved", label: "Reserved" },
  { value: "unavailable", label: "Unavailable" },
];

export default function MyListingsScreen() {
  const [listings, setListings] = useState<ResourceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadListings = async () => {
    try {
      const response = await fetchMyResourceListings();
      setListings(response.results);
    } catch {
      setErrorMessage("Could not load your listings.");
    } finally {
      setIsLoading(false);
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

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1d4ed8" /></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}><Text style={styles.backLink}>← My Resources</Text></Pressable>
      <View style={styles.header}>
        <Text style={styles.title}>My Listings</Text>
        <Pressable style={styles.addButton} onPress={() => router.push("/resources/create")}><Text style={styles.addButtonText}>Add listing</Text></Pressable>
      </View>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {listings.length === 0 ? <Text style={styles.emptyText}>You have not added a listing yet.</Text> : null}
      {listings.map((listing) => (
        <View key={listing.id} style={styles.card}>
          <Text style={styles.cardTitle}>{listing.title}</Text>
          <Text style={styles.meta}>{listing.category.replace("_", " ")} · {listing.condition}</Text>
          <View style={styles.listingActions}>
            <Pressable style={styles.editButton} onPress={() => router.push(`/resources/edit/${listing.id}`)}><Text style={styles.editButtonText}>Edit</Text></Pressable>
            <Pressable style={styles.deleteButton} onPress={() => deleteListing(listing)}><Text style={styles.deleteButtonText}>Delete</Text></Pressable>
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
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flexGrow: 1, padding: 20, paddingTop: 56 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  backLink: { color: "#1d4ed8", fontWeight: "700", marginBottom: 20 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  title: { color: "#0f172a", fontSize: 26, fontWeight: "700" },
  addButton: { backgroundColor: "#1d4ed8", borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 },
  addButtonText: { color: "#ffffff", fontWeight: "700" },
  card: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 12, borderWidth: 1, gap: 9, marginBottom: 12, padding: 16 },
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
  statusText: { color: "#475569" }, selectedStatusText: { color: "#1d4ed8", fontWeight: "700" },
  emptyText: { color: "#64748b", textAlign: "center", marginTop: 80 }, errorText: { color: "#b91c1c", marginBottom: 12 },
});
