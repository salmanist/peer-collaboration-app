import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import {
  cancelPeerRequest,
  createPeerRequest,
  listPeerRequests,
  respondToPeerRequest,
  type PeerRequestKind,
  type PeerRideRequest,
} from "../data/ondemandApi";
import { usePolling } from "./usePolling";
import type { RideLocation } from "../../rides/data/ridesApi";
import { LocationAutocomplete } from "../../rides/presentation/LocationAutocomplete";

const POPULAR_LOCATIONS = [
  "Main Campus",
  "DHA Phase 5",
  "DHA Phase 6",
  "Johar Town",
  "Gulberg III",
  "Model Town",
  "Cantt",
  "Ring Road",
];

const SEAT_OPTIONS = [1, 2, 3, 4];

const TIME_OPTIONS = [
  "In 5 mins",
  "In 10 mins",
  "In 15 mins",
  "In 30 mins",
];

interface PeerLiftBoardProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  searchQuery?: string;
}

export function PeerLiftBoard({ isModalOpen, onCloseModal, onOpenModal, searchQuery }: PeerLiftBoardProps) {
  const currentUser = useSessionStore((state) => state.user);
  const [requests, setRequests] = useState<PeerRideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Form state
  const [kind, setKind] = useState<PeerRequestKind>("offering");
  const [seats, setSeats] = useState(3);
  const [pickup, setPickup] = useState("");
  // Coordinates from a dropdown area or a pin; null when the student only typed text.
  const [pickupSpot, setPickupSpot] = useState<RideLocation | null>(null);
  const [dropSpot, setDropSpot] = useState<RideLocation | null>(null);
  const [drop, setDrop] = useState("");
  const [departureTime, setDepartureTime] = useState("In 5 mins");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const data = await listPeerRequests();
      setRequests(data);
    } catch {
      // Keep existing list on failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  usePolling(loadRequests, 10000);

  const myOpenRequest = requests.find((r) => r.poster.id === currentUser?.id);
  const myAcceptedRide = requests.find((r) => r.responder?.id === currentUser?.id && r.status === "accepted");
  const otherRequests = requests
    .filter((r) => r.poster.id !== currentUser?.id && r.responder?.id !== currentUser?.id)
    .filter((r) => {
      if (!searchQuery?.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.pickup_label.toLowerCase().includes(q) ||
        r.drop_label.toLowerCase().includes(q) ||
        r.poster.full_name.toLowerCase().includes(q) ||
        (r.note && r.note.toLowerCase().includes(q)) ||
        (r.departure_time && r.departure_time.toLowerCase().includes(q))
      );
    });

  const handleCancelMyPost = async (id: number) => {
    setActionLoadingId(id);
    try {
      await cancelPeerRequest(id);
      await loadRequests();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.detail ?? "Couldn't cancel this post.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRespond = async (request: PeerRideRequest) => {
    const isOffering = request.kind === "offering";
    const confirmMessage = isOffering
      ? `Ask to join ${request.poster.full_name}'s lift to ${request.drop_label}?`
      : `Offer to take ${request.poster.full_name} to ${request.drop_label}?`;

    const proceed = () => {
      setActionLoadingId(request.id);
      respondToPeerRequest(request.id)
        .then(() => {
          loadRequests();
          router.push({
            pathname: "/(app)/ondemand/chat/[requestId]",
            params: {
              requestId: String(request.id),
              partnerName: request.poster.full_name,
              routeSummary: `${request.pickup_label} → ${request.drop_label}`,
            },
          } as any);
        })
        .catch((err: any) => {
          Alert.alert("Error", err?.response?.data?.detail ?? "Could not connect to this ride.");
        })
        .finally(() => setActionLoadingId(null));
    };

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) proceed();
    } else {
      Alert.alert("Confirm Lift Connection", confirmMessage, [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: proceed },
      ]);
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!pickup.trim()) {
      setFormError("Enter your pickup location.");
      return;
    }
    if (!drop.trim()) {
      setFormError("Enter your destination.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createPeerRequest({
        kind,
        seats: kind === "offering" ? seats : 1,
        pickup_label: pickup.trim(),
        drop_label: drop.trim(),
        ...(pickupSpot && { pickup_lat: pickupSpot.lat, pickup_lng: pickupSpot.lng }),
        ...(dropSpot && { drop_lat: dropSpot.lat, drop_lng: dropSpot.lng }),
        departure_time: departureTime,
        note: note.trim(),
      });
      setPickup("");
      setDrop("");
      setPickupSpot(null);
      setDropSpot(null);
      setDepartureTime("In 5 mins");
      setNote("");
      onCloseModal();
      await loadRequests();
      Alert.alert(
        "Posted to Live Board!",
        kind === "offering"
          ? "Your immediate lift offer is now live. Peers can see and join you!"
          : "Your ride request is now live. Available peers will see your post!",
      );
    } catch (err: any) {
      setFormError(err?.response?.data?.detail ?? "Couldn't post your ride. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff === 1) return "1m ago";
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <View style={styles.container}>
      {/* Header Bar with Action Button */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={styles.liveIndicator} />
            <Text style={styles.title}>Live Campus Lift Board</Text>
          </View>
        </View>


      </View>

      {/* User's Accepted Lift Card (if joined as responder) */}
      {myAcceptedRide && (
        <View style={styles.myPostCard}>
          <View style={styles.myPostTopRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
              <View style={[styles.myPostBadge, { backgroundColor: appColors.successBg, borderColor: appColors.successBorder }]}>
                <MaterialCommunityIcons name="car-connected" size={14} color={appColors.emerald800} />
                <Text style={[styles.myPostBadgeText, { color: appColors.emerald800 }]}>
                  {myAcceptedRide.kind === "offering" ? "Joined Peer's Lift" : "Taking Peer to Destination"}
                </Text>
              </View>
              <View style={styles.departureBadge}>
                <MaterialCommunityIcons name="clock-outline" size={12} color={appColors.primary} />
                <Text style={styles.departureBadgeText}>
                  {myAcceptedRide.departure_time || "Right now"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.routeRow}>
            <MaterialCommunityIcons name="navigation-variant" size={16} color={appColors.primary} />
            <Text style={styles.routeText}>
              {myAcceptedRide.pickup_label} → {myAcceptedRide.drop_label}
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: "700", color: appColors.textSecondary }}>
            Partner: {myAcceptedRide.poster.full_name}
          </Text>

          <View style={[styles.myPostFooter, { marginTop: 8 }]}>
            <Pressable
              style={styles.chatActionBtn}
              onPress={() =>
                router.push({
                  pathname: "/(app)/ondemand/chat/[requestId]",
                  params: {
                    requestId: String(myAcceptedRide.id),
                    partnerName: myAcceptedRide.poster.full_name,
                    routeSummary: `${myAcceptedRide.pickup_label} → ${myAcceptedRide.drop_label}`,
                  },
                } as any)
              }
            >
              <MaterialCommunityIcons name="chat-outline" size={16} color={appColors.white} style={{ marginRight: 6 }} />
              <Text style={styles.chatActionBtnText}>Open Live Coordination Chat</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* User's Active Post Card */}
      {myOpenRequest && (
        <View style={styles.myPostCard}>
          <View style={styles.myPostTopRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
              <View style={styles.myPostBadge}>
                <MaterialCommunityIcons
                  name={myOpenRequest.kind === "offering" ? "car" : "human-greeting"}
                  size={14}
                  color={appColors.primary}
                />
                <Text style={styles.myPostBadgeText}>
                  {myOpenRequest.kind === "offering"
                    ? `My Post: Leaving (${myOpenRequest.seats} seats)`
                    : "My Post: Need Ride"}
                </Text>
              </View>

              <View style={styles.departureBadge}>
                <MaterialCommunityIcons name="clock-outline" size={12} color={appColors.primary} />
                <Text style={styles.departureBadgeText}>
                  {myOpenRequest.departure_time || "Right now"}
                </Text>
              </View>
            </View>
            <Text style={styles.timeText}>{timeAgo(myOpenRequest.created_at)}</Text>
          </View>

          <View style={styles.routeRow}>
            <MaterialCommunityIcons name="navigation-variant" size={16} color={appColors.primary} />
            <Text style={styles.routeText}>
              {myOpenRequest.pickup_label} → {myOpenRequest.drop_label}
            </Text>
          </View>

          {!!myOpenRequest.note && <Text style={styles.noteText}>"{myOpenRequest.note}"</Text>}

          <View style={styles.myPostFooter}>
            {myOpenRequest.status === "accepted" && myOpenRequest.responder ? (
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: appColors.success }}>
                  Connected with {myOpenRequest.responder.full_name}!
                </Text>
                <Pressable
                  style={styles.chatActionBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/ondemand/chat/[requestId]",
                      params: {
                        requestId: String(myOpenRequest.id),
                        partnerName: myOpenRequest.responder?.full_name,
                        routeSummary: `${myOpenRequest.pickup_label} → ${myOpenRequest.drop_label}`,
                      },
                    } as any)
                  }
                >
                  <MaterialCommunityIcons name="chat-outline" size={16} color={appColors.white} style={{ marginRight: 6 }} />
                  <Text style={styles.chatActionBtnText}>Open Live Coordination Chat</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.waitingNotice}>
                  <ActivityIndicator size="small" color={appColors.primary} /> Waiting for peers to respond…
                </Text>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => handleCancelMyPost(myOpenRequest.id)}
                  disabled={actionLoadingId === myOpenRequest.id}
                >
                  {actionLoadingId === myOpenRequest.id ? (
                    <ActivityIndicator size="small" color={appColors.danger} />
                  ) : (
                    <Text style={styles.cancelBtnText}>Cancel Post</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}

      {/* Loading Skeleton */}
      {isLoading && requests.length === 0 ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={appColors.primary} />
          <Text style={styles.emptySubtitle}>Checking live departures…</Text>
        </View>
      ) : otherRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="clock-fast" size={38} color={appColors.textMuted} />
          <Text style={styles.emptyTitle}>
            {searchQuery?.trim() ? "No matching live rides" : "No active posts right now"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery?.trim()
              ? `No live requests found matching "${searchQuery}". Try another keyword or location.`
              : 'Leaving campus right now? Tap "+" below to offer empty seats or ask for a lift!'}
          </Text>
        </View>
      ) : (
        /* List of Peer Requests */
        otherRequests.map((item) => {
          const isOffering = item.kind === "offering";
          const isBusy = actionLoadingId === item.id;
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
                  <View style={[styles.badge, isOffering ? styles.offeringBadge : styles.needBadge]}>
                    <MaterialCommunityIcons
                      name={isOffering ? "car" : "human-greeting"}
                      size={12}
                      color={isOffering ? appColors.emerald800 : appColors.onSecondaryContainer}
                    />
                    <Text style={[styles.badgeText, isOffering ? styles.offeringBadgeText : styles.needBadgeText]}>
                      {isOffering ? `Offering · ${item.seats} Seats` : "Needs Ride"}
                    </Text>
                  </View>

                  <View style={styles.departureBadge}>
                    <MaterialCommunityIcons name="clock-outline" size={11} color={appColors.primary} />
                    <Text style={styles.departureBadgeText}>
                      {item.departure_time || "Right now"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
              </View>

              {/* Poster info */}
              <View style={styles.posterRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {item.poster.full_name ? item.poster.full_name[0].toUpperCase() : "U"}
                  </Text>
                </View>
                <Text style={styles.posterName}>{item.poster.full_name}</Text>
              </View>

              {/* Route */}
              <View style={styles.routeBlock}>
                <View style={styles.routeItem}>
                  <View style={styles.pickupDot} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.pickup_label}
                  </Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeItem}>
                  <View style={styles.dropDot} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.drop_label}
                  </Text>
                </View>
              </View>

              {!!item.note && <Text style={styles.cardNote}>"{item.note}"</Text>}

              {/* Action Button */}
              <Pressable
                style={[styles.actionBtn, isOffering ? styles.joinBtn : styles.offerBtn]}
                onPress={() => handleRespond(item)}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={isOffering ? appColors.white : appColors.primary} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={isOffering ? "account-plus" : "steering"}
                      size={15}
                      color={isOffering ? appColors.white : appColors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.actionBtnText, !isOffering && styles.offerBtnText]}>
                      {isOffering ? "Ask to Join Lift" : "I Can Take You"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          );
        })
      )}

      {/* Post Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent onRequestClose={onCloseModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={onCloseModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Immediate Ride</Text>
              <Pressable onPress={onCloseModal} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={22} color={appColors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            {formError && (
              <View style={styles.modalError}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.danger} />
                <Text style={styles.modalErrorText}>{formError}</Text>
              </View>
            )}

            {/* Kind Switcher */}
            <View style={styles.typeSwitcher}>
              <Pressable
                style={[styles.typeOption, kind === "offering" && styles.typeOptionActive]}
                onPress={() => setKind("offering")}
              >
                <MaterialCommunityIcons
                  name="car"
                  size={16}
                  color={kind === "offering" ? appColors.primary : appColors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.typeText, kind === "offering" && styles.typeTextActive]}>
                  Leaving Now (Offer Lift)
                </Text>
              </Pressable>

              <Pressable
                style={[styles.typeOption, kind === "need_ride" && styles.typeOptionActive]}
                onPress={() => setKind("need_ride")}
              >
                <MaterialCommunityIcons
                  name="human-greeting"
                  size={16}
                  color={kind === "need_ride" ? appColors.primary : appColors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.typeText, kind === "need_ride" && styles.typeTextActive]}>
                  Need a Ride Now
                </Text>
              </Pressable>
            </View>

            {/* Pickup */}
            <View style={styles.inputGroup}>
              <LocationAutocomplete
                placeholder="Pickup Location (e.g. Main Gate)"
                textValue={pickup}
                onTextChange={setPickup}
                onChange={setPickupSpot}
                enablePin
              />
            </View>

            {/* Destination */}
            <View style={styles.inputGroup}>
              <LocationAutocomplete
                placeholder="Destination (e.g. DHA Phase 5)"
                textValue={drop}
                onTextChange={setDrop}
                onChange={setDropSpot}
                enablePin
              />
            </View>

            {/* Seats if offering */}
            {kind === "offering" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>AVAILABLE SEATS</Text>
                <View style={styles.seatsRow}>
                  {SEAT_OPTIONS.map((num) => (
                    <Pressable
                      key={num}
                      style={[styles.seatPill, seats === num && styles.seatPillActive]}
                      onPress={() => setSeats(num)}
                    >
                      <Text style={[styles.seatPillText, seats === num && styles.seatPillTextActive]}>
                        {num} {num === 1 ? "seat" : "seats"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Departure Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {kind === "offering" ? "WHEN ARE YOU LEAVING?" : "WHEN DO YOU NEED THE RIDE?"}
              </Text>
              <View style={styles.timeChipsWrap}>
                {TIME_OPTIONS.map((timeOpt) => {
                  const isSelected = departureTime === timeOpt;
                  return (
                    <Pressable
                      key={timeOpt}
                      style={[styles.timeChip, isSelected && styles.timeChipActive]}
                      onPress={() => setDepartureTime(timeOpt)}
                    >
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={13}
                        color={isSelected ? appColors.primary : appColors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}>
                        {timeOpt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

            </View>

            {/* Note */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.textInput}
                placeholder="Optional short note (e.g. Leaving in 5 mins)"
                value={note}
                onChangeText={setNote}
                placeholderTextColor={appColors.textMuted}
                maxLength={100}
              />
            </View>

            {/* Submit */}
            <Pressable
              style={[
                styles.submitBtn,
                isSubmitting && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={appColors.ink} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {kind === "offering" ? "Post Lift (Leaving Now)" : "Post Ride Request"}
                </Text>
              )}
            </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.success,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.text,
  },
  subtitle: {
    fontSize: 12,
    color: appColors.textSecondary,
    marginTop: 1,
  },
  postBtn: {
    backgroundColor: appColors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  postBtnText: {
    color: appColors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  myPostCard: {
    backgroundColor: appColors.green50,
    borderWidth: 1.5,
    borderColor: appColors.successBorder,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  myPostTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  myPostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  myPostBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: appColors.primary,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
  },
  noteText: {
    fontSize: 12,
    fontStyle: "italic",
    color: appColors.textSecondary,
  },
  myPostFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: appColors.successBg,
  },
  waitingNotice: {
    fontSize: 11,
    color: appColors.primary,
    fontWeight: "600",
  },
  cancelBtn: {
    backgroundColor: appColors.red50,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.danger,
  },
  card: {
    backgroundColor: appColors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: appColors.border,
    padding: 14,
    gap: 10,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  offeringBadge: {
    backgroundColor: appColors.emerald100,
  },
  needBadge: {
    backgroundColor: appColors.warningBg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  offeringBadgeText: {
    color: appColors.emerald800,
  },
  needBadgeText: {
    color: appColors.onSecondaryContainer,
  },
  timeText: {
    fontSize: 11,
    color: appColors.textMuted,
  },
  posterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: appColors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: appColors.border,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "800",
    color: appColors.primary,
  },
  posterName: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.text,
  },
  routeBlock: {
    gap: 4,
    backgroundColor: appColors.surfaceMuted,
    padding: 10,
    borderRadius: 10,
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.primary,
  },
  dropDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: appColors.danger,
  },
  routeLine: {
    width: 1.5,
    height: 8,
    backgroundColor: appColors.border,
    marginLeft: 3.5,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.text,
    flex: 1,
  },
  cardNote: {
    fontSize: 12,
    fontStyle: "italic",
    color: appColors.textSecondary,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  joinBtn: {
    backgroundColor: appColors.primary,
  },
  offerBtn: {
    backgroundColor: appColors.gold,
  },
  offerBtnText: {
    color: appColors.primary,
  },
  actionBtnText: {
    color: appColors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: appColors.border,
    borderStyle: "dashed",
    borderRadius: 14,
    backgroundColor: appColors.white,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: appColors.blackA50,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    backgroundColor: appColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: appColors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: appColors.textSecondary,
    marginTop: 1,
  },
  modalError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: appColors.red50,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.dangerBg,
  },
  modalErrorText: {
    fontSize: 12,
    color: appColors.danger,
    fontWeight: "600",
  },
  typeSwitcher: {
    flexDirection: "row",
    backgroundColor: appColors.border,
    borderRadius: 12,
    padding: 3,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 9,
  },
  typeOptionActive: {
    backgroundColor: appColors.white,
    elevation: 1,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.textSecondary,
  },
  typeTextActive: {
    color: appColors.primary,
    fontWeight: "800",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: appColors.textMuted,
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: appColors.text,
  },
  chipScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  chip: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  chipActive: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  chipTextActive: {
    color: appColors.primary,
    fontWeight: "700",
  },
  seatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  seatPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceMuted,
  },
  seatPillActive: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.primary,
  },
  seatPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  seatPillTextActive: {
    color: appColors.primary,
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: appColors.gold,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: appColors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  submitBtnYellow: {
    backgroundColor: appColors.gold,
  },
  submitBtnTextYellow: {
    color: appColors.ink,
    fontWeight: "800",
  },
  departureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: appColors.green50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.successBg,
  },
  departureBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
  },
  timeChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  timeChipActive: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.primary,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  timeChipTextActive: {
    color: appColors.primary,
    fontWeight: "700",
  },
  chatActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: appColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: "100%",
  },
  chatActionBtnText: {
    color: appColors.white,
    fontSize: 13,
    fontWeight: "700",
  },
});
