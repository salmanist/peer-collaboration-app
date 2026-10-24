import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSessionStore } from "../../../core/auth/session";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { fetchMyPublicResourceOffers, fetchPublicResourceRequest } from "../data/resourcesApi";
import type { PublicResourceOffer, PublicResourceRequest } from "../resources";

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

export default function PublicResourceRequestDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSessionStore((state) => state.user);
  const [request, setRequest] = useState<PublicResourceRequest | null>(null);
  const [existingOffer, setExistingOffer] = useState<PublicResourceOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  useEffect(() => {
    const requestId = Number(id);
    if (!Number.isInteger(requestId)) {
      setErrorMessage("This request link is invalid.");
      setIsLoading(false);
      return;
    }
    let isActive = true;
    Promise.all([fetchPublicResourceRequest(requestId), fetchMyPublicResourceOffers().catch(() => null)])
      .then(([loadedRequest, myOffers]) => {
        if (!isActive) return;
        setRequest(loadedRequest);
        setExistingOffer(myOffers?.results.find((offer) => offer.public_request_id === requestId) ?? null);
      })
      .catch(() => isActive && setErrorMessage("Could not load this request."))
      .finally(() => isActive && setIsLoading(false));
    return () => {
      isActive = false;
    };
  }, [id]);

  const isMine = request?.requester_id === user?.id;

  return (
    <View style={styles.rootContainer}>
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/resources")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
        </Pressable>
        <Text style={styles.topNavTitle}>Request Details</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={appColors.primary} />
      ) : !request ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}>
          <View style={styles.card}>
            <View style={styles.wantedBadge}>
              <Text style={styles.wantedBadgeText}>{getDesiredExchangeLabel(request.desired_exchange_type)}</Text>
            </View>
            <Text style={styles.title}>{request.title}</Text>

            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="tag-outline" size={14} color={appColors.textSecondary} />
              <Text style={styles.metaText}>{request.category.replace("_", " ")}</Text>
            </View>
            {request.course ? (
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="target" size={14} color={appColors.primary} />
                <Text style={styles.metaText}>{request.course}</Text>
              </View>
            ) : null}

            {request.description ? (
              <>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.description}>{request.description}</Text>
              </>
            ) : null}

            <Text style={styles.sectionLabel}>Requested by</Text>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="account-outline" size={14} color={appColors.primary} />
              <Text style={styles.metaText}>
                {request.requester_name || "LGU Student"}
                {request.requester_department
                  ? ` (${request.requester_department}${request.requester_enrollment_year ? ` • ${request.requester_enrollment_year}` : ""})`
                  : ""}
              </Text>
            </View>
          </View>

          {isMine ? (
            <Pressable style={styles.secondaryBtn} onPress={() => router.push(`/resources/wanted/edit/${request.id}` as any)}>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={appColors.primary} />
              <Text style={styles.secondaryBtnText}>Edit Your Request</Text>
            </Pressable>
          ) : existingOffer ? (
            <View style={styles.secondaryBtn}>
              <MaterialCommunityIcons name="check-circle" size={16} color={appColors.primary} />
              <Text style={styles.secondaryBtnText}>Offer Sent: {existingOffer.status.toUpperCase()}</Text>
            </View>
          ) : (
            <Pressable style={styles.primaryBtn} onPress={() => router.push(`/resources/wanted/offer/${request.id}` as any)}>
              <MaterialCommunityIcons name="hand-heart-outline" size={16} color={appColors.black} />
              <Text style={styles.primaryBtnText}>I Have This / Send Offer</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: appColors.surfaceMuted },
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
  topNavTitle: { fontSize: 16, fontWeight: "800", color: appColors.onHeader },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: appColors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.surfaceContainer,
    padding: 18,
    gap: 8,
    shadowColor: appColors.black,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  wantedBadge: {
    alignSelf: "flex-start",
    backgroundColor: appColors.amber50,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  wantedBadgeText: { color: appColors.amber700, fontSize: 12, fontWeight: "700" },
  title: { color: appColors.primary, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: appColors.textSecondary, fontSize: 13, fontWeight: "500", textTransform: "capitalize" },
  sectionLabel: { color: appColors.primary, fontSize: 13, fontWeight: "800", marginTop: 10 },
  description: { color: appColors.text, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: appColors.gold,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: { color: appColors.black, fontSize: 14, fontWeight: "800" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryBtnText: { color: appColors.primary, fontSize: 14, fontWeight: "700" },
  errorText: { color: appColors.danger, padding: 20, fontSize: 14, fontWeight: "600" },
});
