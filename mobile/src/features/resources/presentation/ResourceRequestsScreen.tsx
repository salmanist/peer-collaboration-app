import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ResourceCardSkeleton, SkeletonList } from "../../../core/components/Skeleton";

import { useSessionStore } from "../../../core/auth/session";
import {
  fetchIncomingResourceInterestRequests,
  fetchMyResourceInterestRequests,
  updateResourceInterestRequestStatus,
} from "../data/resourcesApi";
import { useResourceNotificationStore } from "../resourceNotifications";
import type { ResourceInterestRequest, ResourceInterestRequestStatus } from "../resources";

function labelStatus(status: ResourceInterestRequestStatus) {
  return status[0].toUpperCase() + status.slice(1);
}

export default function ResourceRequestsScreen() {
  const insets = useSafeAreaInsets();
  const [incomingRequests, setIncomingRequests] = useState<ResourceInterestRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ResourceInterestRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const user = useSessionStore((state) => state.user);
  const markInterestRequestsRead = useResourceNotificationStore((state) => state.markInterestRequestsRead);

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  const loadRequests = async (refresh = false) => {
    setErrorMessage("");
    if (refresh) {
      setIsRefreshing(true);
    } else if (!incomingRequests.length && !sentRequests.length) {
      setIsLoading(true);
    }
    try {
      const [incomingRes, sentRes] = await Promise.allSettled([
        fetchIncomingResourceInterestRequests(),
        fetchMyResourceInterestRequests(),
      ]);
      if (incomingRes.status === "fulfilled") {
        const incoming = incomingRes.value;
        const incomingList = Array.isArray(incoming) ? incoming : (incoming?.results || []);
        setIncomingRequests(incomingList);
      }
      if (sentRes.status === "fulfilled") {
        const sent = sentRes.value;
        const sentList = Array.isArray(sent) ? sent : (sent?.results || []);
        setSentRequests(sentList);
      }
      if (incomingRes.status === "rejected" && sentRes.status === "rejected") {
        setErrorMessage("Could not load requests. Tap to retry.");
      }
      if (user) void markInterestRequestsRead(user.id);
    } catch {
      setErrorMessage("Could not load requests. Tap to retry.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [user, markInterestRequestsRead]);

  const updateRequest = async (requestId: number, status: ResourceInterestRequestStatus) => {
    try {
      await updateResourceInterestRequestStatus(requestId, status);
      await loadRequests(true);
    } catch {
      setErrorMessage("Could not update this request.");
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => goBack("/(app)/resources")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
        </Pressable>
        <Text style={styles.topNavTitle}>Interest Requests</Text>
        <View style={{ width: 36 }} />
      </View>

      {errorMessage ? (
        <Pressable style={styles.errorBox} onPress={() => void loadRequests(true)}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.red700} style={{ marginRight: 4 }} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <MaterialCommunityIcons name="reload" size={14} color={appColors.red700} style={{ marginLeft: 6 }} />
        </Pressable>
      ) : null}

      {isLoading ? (
        <SkeletonList count={3} renderItem={() => <ResourceCardSkeleton />} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 40, 60) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void loadRequests(true)}
              colors={[appColors.primary]}
              tintColor={appColors.primary}
            />
          }
        >
          {/* Section 1: Incoming */}
          <Text style={styles.sectionHeader}>Incoming Interest on Your Items</Text>
          {incomingRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No students have requested your items yet.</Text>
            </View>
          ) : (
            incomingRequests.map((interestRequest) => (
              <RequestCard
                key={interestRequest.id}
                interestRequest={interestRequest}
                kind="incoming"
                onUpdate={updateRequest}
              />
            ))
          )}

          {/* Section 2: Sent */}
          <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Requests You Sent to Others</Text>
          {sentRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>You haven't requested any items from peers yet.</Text>
            </View>
          ) : (
            sentRequests.map((interestRequest) => (
              <RequestCard
                key={interestRequest.id}
                interestRequest={interestRequest}
                kind="sent"
                onUpdate={updateRequest}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function RequestCard({
  interestRequest,
  kind,
  onUpdate,
}: {
  interestRequest: ResourceInterestRequest;
  kind: "incoming" | "sent";
  onUpdate: (requestId: number, status: ResourceInterestRequestStatus) => Promise<void>;
}) {
  const isPending = interestRequest.status === "pending";
  const isAccepted = interestRequest.status === "accepted";
  const isCompleted = interestRequest.status === "completed";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {interestRequest.resource_title}
        </Text>
        <View
          style={[
            styles.statusBadge,
            isAccepted || isCompleted
              ? styles.statusAccepted
              : isPending
              ? styles.statusPending
              : styles.statusDeclined,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              isAccepted || isCompleted
                ? styles.statusAcceptedText
                : isPending
                ? styles.statusPendingText
                : styles.statusDeclinedText,
            ]}
          >
            {labelStatus(interestRequest.status)}
          </Text>
        </View>
      </View>

      {kind === "incoming" ? (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          <MaterialCommunityIcons name="account-outline" size={13} color={appColors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.fromText}>From: {interestRequest.requester_name}</Text>
        </View>
      ) : null}

      {interestRequest.message ? (
        <Text style={styles.messageText}>“{interestRequest.message}”</Text>
      ) : null}

      {/* Action Buttons */}
      {kind === "incoming" && isPending ? (
        <View style={styles.actionRow}>
          <Pressable
            style={styles.acceptBtn}
            onPress={() => void onUpdate(interestRequest.id, "accepted")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="check" size={14} color={appColors.white} style={{ marginRight: 4 }} />
              <Text style={styles.acceptBtnText}>Accept Request</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.declineBtn}
            onPress={() => void onUpdate(interestRequest.id, "declined")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="close" size={14} color={appColors.red700} style={{ marginRight: 4 }} />
              <Text style={styles.declineBtnText}>Decline</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {kind === "incoming" && isAccepted ? (
        <View style={styles.actionRow}>
          <Pressable
            style={styles.completeBtn}
            onPress={() => void onUpdate(interestRequest.id, "completed")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="check-circle-outline" size={14} color={appColors.white} style={{ marginRight: 4 }} />
              <Text style={styles.completeBtnText}>Mark Exchange Completed</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {kind === "sent" && (isPending || isAccepted) ? (
        <View style={styles.actionRow}>
          <Pressable
            style={styles.cancelBtn}
            onPress={() => void onUpdate(interestRequest.id, "cancelled")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="close" size={14} color={appColors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.cancelBtnText}>Cancel Request</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {isAccepted ? (
        <Pressable
          style={styles.chatBtn}
          onPress={() =>
            router.push({
              pathname: "/resources/chat/[requestId]",
              params: {
                requestId: String(interestRequest.id),
                resourceTitle: interestRequest.resource_title,
              },
            })
          }
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="chat-outline" size={15} color={appColors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.chatBtnText}>Open Chat with Student</Text>
          </View>
        </Pressable>
      ) : null}
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
  scrollContent: {
    padding: 16,
    gap: 10,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  sectionHeader: {
    color: appColors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  emptyCard: {
    backgroundColor: appColors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 16,
    alignItems: "center",
  },
  emptyCardText: {
    color: appColors.textSecondary,
    fontSize: 12,
  },
  card: {
    backgroundColor: appColors.white,
    borderColor: appColors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitle: {
    color: appColors.text,
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
  statusAccepted: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.border,
    borderWidth: 1,
  },
  statusAcceptedText: {
    color: appColors.icon,
    fontSize: 10,
    fontWeight: "800",
  },
  statusPending: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.amber200,
    borderWidth: 1,
  },
  statusPendingText: {
    color: appColors.icon,
    fontSize: 10,
    fontWeight: "800",
  },
  statusDeclined: {
    backgroundColor: appColors.dangerBg,
    borderColor: appColors.red300,
    borderWidth: 1,
  },
  statusDeclinedText: {
    color: appColors.danger,
    fontSize: 10,
    fontWeight: "800",
  },
  fromText: {
    color: appColors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  messageText: {
    color: appColors.textSecondary,
    fontSize: 12,
    backgroundColor: appColors.background,
    padding: 10,
    borderRadius: 8,
    fontStyle: "italic",
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: appColors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptBtnText: {
    color: appColors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  declineBtn: {
    backgroundColor: appColors.dangerBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.red300,
  },
  declineBtnText: {
    color: appColors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  completeBtn: {
    flex: 1,
    backgroundColor: appColors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  completeBtnText: {
    color: appColors.gold,
    fontSize: 12,
    fontWeight: "700",
  },
  cancelBtn: {
    backgroundColor: appColors.dangerBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.red300,
  },
  cancelBtnText: {
    color: appColors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  chatBtn: {
    backgroundColor: appColors.primary,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  chatBtnText: {
    color: appColors.gold,
    fontSize: 12,
    fontWeight: "800",
  },
  errorBox: {
    margin: 16,
    padding: 12,
    backgroundColor: appColors.dangerBg,
    borderRadius: 8,
  },
  errorText: {
    color: appColors.red700,
    fontSize: 12,
    textAlign: "center",
  },
});
