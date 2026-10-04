import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PublicRequestCardSkeleton, SkeletonList } from "../../../core/components/Skeleton";

import {
  deletePublicResourceRequest,
  fetchMyPublicResourceRequests,
  updatePublicResourceRequestStatus,
} from "../data/resourcesApi";
import type {
  PublicResourceRequest,
  PublicResourceRequestStatus,
} from "../resources";

export default function MyPublicResourceRequestsScreen() {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<PublicResourceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  const loadRequests = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetchMyPublicResourceRequests();
      setRequests(response.results);
    } catch {
      setErrorMessage("Could not load your requests.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const changeStatus = async (id: number, status: PublicResourceRequestStatus) => {
    setUpdatingId(id);
    try {
      await updatePublicResourceRequestStatus(id, status);
      await loadRequests();
    } catch {
      setErrorMessage("Could not update this request.");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteRequest = (request: PublicResourceRequest) => {
    Alert.alert(
      "Delete request?",
      `Are you sure you want to delete “${request.title}”? This action cannot be undone.`,
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

  const renderItem = useCallback(
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
          <View style={styles.actionsRow}>
            {isOpen ? (
              <>
                <Pressable
                  style={styles.fulfillBtn}
                  onPress={() => void changeStatus(request.id, "fulfilled")}
                  disabled={updatingId === request.id}
                >
                  {updatingId === request.id ? (
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
    [updatingId],
  );

  return (
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={handleBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>My Requests</Text>
        <Pressable
          style={styles.navActionBtn}
          onPress={() => router.push("/(app)/resources/wanted/create" as any)}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons name="plus" size={14} color="#0D3E02" style={{ marginRight: 2 }} />
            <Text style={styles.navActionBtnText}>Request</Text>
          </View>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 4 }} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <SkeletonList count={3} renderItem={() => <PublicRequestCardSkeleton />} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          refreshing={isRefreshing}
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
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topNavBar: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.3,
  },
  navActionBtn: {
    backgroundColor: "#FDBF1E",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  navActionBtnText: {
    color: "#0D3E02",
    fontWeight: "900",
    fontSize: 12,
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#F1F5F9",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitle: {
    color: "#070D1F",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
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
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    marginTop: 4,
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
  },
  editBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  editBtnText: {
    color: "#0D3E02",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  deleteBtnText: {
    color: "#DC2626",
    fontSize: 12,
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
