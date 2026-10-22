import { colors as appColors } from "../../../core/ui/theme";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSessionStore } from "../../../core/auth/session";
import {
  acceptPrintRequest,
  cancelPrintRequest,
  completePrintRequest,
  getPrintRequest,
  ratePrintRequest,
  rejectPrintRequest,
  releasePrintRequest,
  type PrintRequest,
} from "../data/printingApi";
import { Stars, describeSettings, statusConfig } from "./printUi";

export default function PrintRequestDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSessionStore((s) => s.user);

  const [request, setRequest] = useState<PrintRequest | null>(null);
  const [collectionNote, setCollectionNote] = useState("");
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const load = useCallback(async () => {
    try {
      setRequest(await getPrintRequest(Number(id)));
    } catch {
      setError("Couldn't load this print request.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const run = async (action: () => Promise<PrintRequest>) => {
    setError(null);
    setIsBusy(true);
    try {
      setRequest(await action());
    } catch (err: any) {
      const detail = err?.response?.data;
      setError(typeof detail?.detail === "string" ? detail.detail : "That didn't work. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  if (!request) {
    return (
      <View style={styles.rootContainer}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/printing")}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
          </Pressable>
          <Text style={styles.topNavTitle}>Print Order Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : <LoadingSkeleton variant="detail" />}
        </View>
      </View>
    );
  }

  const isRequester = request.requester.id === user?.id;
  const isPrinter = request.printer?.id === user?.id;
  const isTarget = request.target_printer?.id === user?.id;
  const status = statusConfig[request.status] || statusConfig.open;

  return (
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/printing")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>Print Order Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        {/* Main Document Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.docIconWrap}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color={appColors.primary} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title} numberOfLines={2}>
                {request.document_name}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <MaterialCommunityIcons name={status.icon} size={13} color={status.text} style={{ marginRight: 4 }} />
                <Text style={[styles.statusBadgeText, { color: status.text }]}>{status.label}</Text>
              </View>
            </View>
          </View>

          {/* Settings Chip */}
          <View style={styles.settingsBox}>
            <MaterialCommunityIcons name="cog-outline" size={16} color={appColors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.settingsText}>{describeSettings(request)}</Text>
          </View>

          {/* People involved */}
          <View style={styles.participantsSection}>
            <View style={styles.personRow}>
              <View style={styles.avatarMini}>
                <MaterialCommunityIcons name="account" size={14} color={appColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.personRole}>Requested by</Text>
                <Text style={styles.personName}>{request.requester.full_name || request.requester.email}</Text>
              </View>
            </View>

            {request.target_printer && request.status === "open" && (
              <View style={styles.personRow}>
                <View style={[styles.avatarMini, { backgroundColor: appColors.surfaceMuted }]}>
                  <MaterialCommunityIcons name="printer" size={14} color={appColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personRole}>Sent specifically to</Text>
                  <Text style={styles.personName}>
                    {request.target_printer.full_name || request.target_printer.email}
                  </Text>
                </View>
              </View>
            )}

            {request.printer && (
              <View style={styles.personRow}>
                <View style={[styles.avatarMini, { backgroundColor: appColors.surfaceMuted }]}>
                  <MaterialCommunityIcons name="printer-check" size={14} color={appColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personRole}>Assigned Printer</Text>
                  <Text style={styles.personName}>{request.printer.full_name || request.printer.email}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Collection note if ready */}
          {request.status === "done" && request.collection_note ? (
            <View style={styles.collectBanner}>
              <MaterialCommunityIcons name="map-marker-check" size={20} color={appColors.primary} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.collectTitle}>Ready for Pickup</Text>
                <Text style={styles.collectText}>{request.collection_note}</Text>
              </View>
            </View>
          ) : null}

          {/* Open Document File Button */}
          <Pressable style={styles.openDocBtn} onPress={() => Linking.openURL(request.document)}>
            <MaterialCommunityIcons name="open-in-new" size={18} color={appColors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.openDocBtnText}>Open / Download Document File</Text>
          </Pressable>

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Actions based on role */}
          {request.status === "open" && !isRequester && (
            <Pressable
              style={[styles.primaryBtn, isBusy && styles.btnDisabled]}
              onPress={() => run(() => acceptPrintRequest(request.id))}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="printer-check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Accept and Print Job</Text>
                </>
              )}
            </Pressable>
          )}

          {request.status === "open" && isTarget && (
            <Pressable
              style={[styles.dangerBtn, isBusy && styles.btnDisabled]}
              onPress={() => run(() => rejectPrintRequest(request.id))}
              disabled={isBusy}
            >
              <Text style={styles.dangerBtnText}>Decline Print Request</Text>
            </Pressable>
          )}

          {request.status === "open" && isRequester && (
            <Pressable
              style={[styles.dangerBtn, isBusy && styles.btnDisabled]}
              onPress={() => run(() => cancelPrintRequest(request.id))}
              disabled={isBusy}
            >
              <Text style={styles.dangerBtnText}>Cancel Request</Text>
            </Pressable>
          )}

          {request.status === "accepted" && isPrinter && (
            <View style={{ gap: 10, marginTop: 4 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Handover / Collection Note (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Left at CS library desk, ask for Ali"
                  placeholderTextColor={appColors.textMuted}
                  value={collectionNote}
                  onChangeText={setCollectionNote}
                />
              </View>

              <Pressable
                style={[styles.primaryBtn, isBusy && styles.btnDisabled]}
                onPress={() => run(() => completePrintRequest(request.id, collectionNote.trim()))}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-all" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryBtnText}>Mark Completed & Ready</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.dangerBtn, isBusy && styles.btnDisabled]}
                onPress={() => run(() => releasePrintRequest(request.id))}
                disabled={isBusy}
              >
                <Text style={styles.dangerBtnText}>Release Job back to Pool</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Rating Section for Requester when Done */}
        {request.status === "done" && isRequester && request.printer && (
          <View style={styles.card}>
            {request.rating ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.ratingHeading}>Your Feedback</Text>
                <Stars score={request.rating.score} />
                {request.rating.comment ? (
                  <Text style={styles.ratingComment}>"{request.rating.comment}"</Text>
                ) : null}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={styles.ratingHeading}>
                  Rate {request.printer.full_name || "your printer"}
                </Text>
                <Stars score={score} onChange={setScore} />

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Feedback Comment (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="How was the print quality and turnaround time?"
                    placeholderTextColor={appColors.textMuted}
                    value={comment}
                    onChangeText={setComment}
                  />
                </View>

                <Pressable
                  style={[styles.primaryBtn, (isBusy || score === 0) && styles.btnDisabled]}
                  onPress={() => run(() => ratePrintRequest(request.id, score, comment.trim()))}
                  disabled={isBusy || score === 0}
                >
                  <Text style={styles.primaryBtnText}>Submit Rating</Text>
                </Pressable>
              </View>
            )}
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
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topNavBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
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
    fontSize: 16,
    fontWeight: "800",
    color: appColors.primary,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  docIconWrap: {
    width: 44,
    height: 44,


    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.text,
    lineHeight: 22,
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  settingsBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.background,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  settingsText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  participantsSection: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingTop: 12,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: appColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  personRole: {
    fontSize: 11,
    color: appColors.textSecondary,
  },
  personName: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  collectBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  collectTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: appColors.primary,
  },
  collectText: {
    fontSize: 12,
    color: appColors.primary,
  },
  openDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: appColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  openDocBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.primary,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    fontSize: 14,
    color: appColors.text,
  },
  primaryBtn: {
    backgroundColor: appColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  dangerBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtnText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  ratingHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: appColors.text,
  },
  ratingComment: {
    fontSize: 13,
    color: appColors.textSecondary,
    fontStyle: "italic",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },
});
