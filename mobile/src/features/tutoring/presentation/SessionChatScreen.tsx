import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
import { Skeleton } from "../../../core/components/Skeleton";
import { ImageSourceModal } from "../../../core/components/ImageSourceModal";
import { API_BASE_URL } from "../../../core/network/apiClient";
import {
  fetchSessionChatMessages,
  fetchTutoringSession,
  sendSessionChatMessage,
  updateTutoringSessionStatus,
} from "../data/tutoringApi";
import { RateTutorModal } from "./RateTutorModal";
import type { TutoringChatMessage, TutoringSession } from "../tutoring";

function websocketBaseUrl() {
  return API_BASE_URL.replace(/^http/, "ws").replace(/\/api\/?$/, "");
}

function getImageUrl(imagePath: string | null | undefined): string | null {
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

export function SessionChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const user = useSessionStore((state) => state.user);
  const accessToken = useSessionStore((state) => state.accessToken);

  const [session, setSession] = useState<TutoringSession | null>(null);
  const [messages, setMessages] = useState<TutoringChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; name?: string; type?: string } | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasAutoPromptedReview, setHasAutoPromptedReview] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/tutoring/sessions/mine" as any);
    }
  };

  const isUserLearner =
    session && (session.learner_id === user?.id || session.learner_email === user?.email);
  const isCompleted = session?.status === "completed";

  const handleManualComplete = () => {
    if (!sessionId) return;
    Alert.alert(
      "Mark Session Completed?",
      "Are you sure you want to finish and mark this tutoring session as completed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Mark Completed",
          style: "default",
          onPress: async () => {
            setIsCompleting(true);
            try {
              const updated = await updateTutoringSessionStatus(Number(sessionId), "completed");
              setSession(updated);
              if (isUserLearner) {
                setShowRatingModal(true);
              } else {
                Alert.alert("Session Completed", "Great job! The tutoring session is now marked completed.");
              }
            } catch (err) {
              console.error("Error completing session:", err);
              Alert.alert("Error", "Could not complete session. Please try again.");
            } finally {
              setIsCompleting(false);
            }
          },
        },
      ],
    );
  };

  // Sync messages from REST
  const syncMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const msgs = await fetchSessionChatMessages(Number(sessionId));
      setMessages(msgs.results || []);
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    }
  }, [sessionId]);

  const refreshSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await fetchTutoringSession(Number(sessionId));
      setSession(data);

      // If learner and completed and unreviewed, auto open rating bottom sheet once
      if (
        data.status === "completed" &&
        !data.review &&
        (data.learner_id === user?.id || data.learner_email === user?.email) &&
        !hasAutoPromptedReview
      ) {
        setHasAutoPromptedReview(true);
        setShowRatingModal(true);
      }
    } catch (err) {
      console.error("Error loading session:", err);
    }
  }, [sessionId, user, hasAutoPromptedReview]);

  // Load session detail
  useEffect(() => {
    if (!sessionId) return;
    refreshSession().finally(() => setIsLoading(false));
    void syncMessages();
  }, [sessionId, refreshSession, syncMessages]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!sessionId) return;

    let isActive = true;
    let reconnectTimeout: any = null;

    const connectSocket = () => {
      try {
        const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
        const wsUrl = `${websocketBaseUrl()}/ws/tutoring/sessions/${sessionId}/chat/${tokenQuery}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          // Connected
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === "chat_message" && data.message) {
              const newMsg = data.message as TutoringChatMessage;
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          } catch (err) {
            console.error("Error parsing WS message:", err);
          }
        };

        ws.onclose = () => {
          if (isActive) {
            reconnectTimeout = setTimeout(connectSocket, 4000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };

        socketRef.current = ws;
      } catch (err) {
        console.error("WebSocket setup error:", err);
      }
    };

    connectSocket();

    // Fast background sync interval
    const pollInterval = setInterval(() => {
      if (isActive) void syncMessages();
    }, 2500);

    return () => {
      isActive = false;
      clearInterval(pollInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [sessionId, accessToken, syncMessages]);

  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text && !selectedPhoto) return;

    setIsSending(true);
    try {
      const newMsg = await sendSessionChatMessage(Number(sessionId), {
        body: text,
        image: selectedPhoto,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      setInputText("");
      setSelectedPhoto(null);
    } catch (err) {
      console.error("Error sending message:", err);
      Alert.alert("Error", "Could not send message. Please check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Pressable
            style={styles.navBackBtn}
            onPress={handleBack}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center", marginHorizontal: 12 }}>
            <Skeleton width={130} height={18} borderRadius={4} style={{ marginBottom: 4 }} />
            <Skeleton width={80} height={12} borderRadius={4} />
          </View>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, padding: 16, gap: 14 }}>
          <View style={{ alignSelf: "flex-start", width: "65%" }}>
            <Skeleton width="100%" height={48} borderRadius={12} />
          </View>
          <View style={{ alignSelf: "flex-end", width: "70%" }}>
            <Skeleton width="100%" height={56} borderRadius={12} />
          </View>
          <View style={{ alignSelf: "flex-start", width: "50%" }}>
            <Skeleton width="100%" height={40} borderRadius={12} />
          </View>
        </View>
      </View>
    );
  }

  const partnerName = session?.tutor_id === user?.id ? session?.learner_name : session?.tutor_name;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={handleBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <View style={styles.topNavCenter}>
          <Text style={styles.topNavTitle} numberOfLines={1}>
            {partnerName || "Tutoring Chat"}
          </Text>
          <Text style={styles.topNavSub} numberOfLines={1}>
            {session?.subject_or_skill}
          </Text>
        </View>
        <Pressable
          style={styles.sessionsBtn}
          onPress={() => router.push("/(app)/tutoring/sessions/mine" as any)}
        >
          <Text style={styles.sessionsBtnText}>Sessions</Text>
        </Pressable>
      </View>

      {/* Manual Complete Quick Bar for Ongoing Sessions */}
      {session?.status === "accepted" && (
        <View style={styles.activeSessionBar}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="circle" size={10} color={appColors.icon} style={{ marginRight: 5 }} />
              <Text style={styles.activeSessionBadgeText}>Active Session</Text>
            </View>
            <Text style={styles.activeSessionSub}>Finished meeting? Tap to complete:</Text>
          </View>
          <Pressable
            style={styles.completeChatSessionBtn}
            onPress={handleManualComplete}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <ActivityIndicator size="small" color={appColors.text} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="check-circle-outline" size={15} color={appColors.text} style={{ marginRight: 4 }} />
                <Text style={styles.completeChatSessionBtnText}>Mark Completed</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chat-outline" size={48} color={appColors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Live Coordination Chat</Text>
            <Text style={styles.emptySubtitle}>
              Say hi to {partnerName}! Coordinate your meeting location, study notes, or share questions.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id;
          const imgUrl = getImageUrl(item.image);

          return (
            <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther]}>
              {!isMe && (
                <Text style={styles.senderName}>{item.sender_name}</Text>
              )}
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                {imgUrl ? (
                  <Pressable onPress={() => setZoomImage(imgUrl)}>
                    <Image source={{ uri: imgUrl }} style={styles.chatImage} resizeMode="cover" />
                  </Pressable>
                ) : null}
                {item.body ? (
                  <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                    {item.body}
                  </Text>
                ) : null}
                <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Photo Preview if Selected */}
      {selectedPhoto && (
        <View style={styles.photoPreviewBar}>
          <Image source={{ uri: selectedPhoto.uri }} style={styles.previewThumb} />
          <Text style={styles.previewName} numberOfLines={1}>{selectedPhoto.name}</Text>
          <Pressable onPress={() => setSelectedPhoto(null)} style={styles.removePhotoBtn}>
            <MaterialCommunityIcons name="close-circle" size={18} color={appColors.danger} />
          </Pressable>
        </View>
      )}

      {/* Bottom Bar: Completed Banner or Active Input Bar */}
      {isCompleted ? (
        <View
          style={[
            styles.completedChatBanner,
            { paddingBottom: Math.max(insets.bottom + 12, 16) },
          ]}
        >
          <View style={styles.lockIconCircle}>
            <MaterialCommunityIcons name="lock-outline" size={18} color={appColors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.completedChatTitle}>Session Completed</Text>
            <Text style={styles.completedChatSub}>
              Messaging is closed for this session. Chat history is preserved.
            </Text>
          </View>
          {isUserLearner && !session?.review && (
            <Pressable
              style={styles.rateFromChatBtn}
              onPress={() => setShowRatingModal(true)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="star-outline" size={14} color={appColors.icon} style={{ marginRight: 3 }} />
                <Text style={styles.rateFromChatBtnText}>Rate</Text>
              </View>
            </Pressable>
          )}
        </View>
      ) : (
        <View
          style={[
            styles.inputBar,
            { paddingBottom: Math.max(insets.bottom + 8, 12) },
          ]}
        >
          <Pressable style={styles.attachBtn} onPress={() => setIsImagePickerOpen(true)}>
            <MaterialCommunityIcons name="camera-outline" size={20} color={appColors.primary} />
          </Pressable>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Message ${partnerName || "peer"}...`}
            placeholderTextColor={appColors.textMuted}
            multiline
            returnKeyType="default"
          />

          <Pressable
            style={[styles.sendBtn, (!inputText.trim() && !selectedPhoto) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() && !selectedPhoto}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={appColors.black} />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Photo Zoom Modal */}
      {zoomImage && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setZoomImage(null)}>
          <View style={styles.zoomOverlay}>
            <Pressable style={styles.closeZoomBtn} onPress={() => setZoomImage(null)}>
              <MaterialCommunityIcons name="close" size={24} color={appColors.white} />
            </Pressable>
            <Image source={{ uri: zoomImage }} style={styles.zoomImage} resizeMode="contain" />
          </View>
        </Modal>
      )}

      {/* Rate Tutor Bottom Sheet Modal for Learner */}
      {showRatingModal && session && (
        <RateTutorModal
          visible={showRatingModal}
          session={session}
          onClose={() => setShowRatingModal(false)}
          onSuccess={() => {
            setShowRatingModal(false);
            void refreshSession();
          }}
        />
      )}

      {/* Camera vs Gallery Picker Modal */}
      <ImageSourceModal
        visible={isImagePickerOpen}
        onClose={() => setIsImagePickerOpen(false)}
        onImageSelected={(img) => setSelectedPhoto(img)}
        title="Send a Photo"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  topNavCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 10,
  },
  topNavTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: appColors.primary,
  },
  topNavSub: {
    fontSize: 11,
    color: appColors.textSecondary,
    marginTop: 1,
  },
  sessionsBtn: {
    backgroundColor: appColors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sessionsBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  activeSessionBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
    gap: 12,
  },
  activeSessionBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: appColors.primary,
  },
  activeSessionSub: {
    fontSize: 11,
    color: appColors.green700,
    marginTop: 1,
  },
  completeChatSessionBtn: {
    backgroundColor: appColors.gold,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: appColors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 2,
  },
  completeChatSessionBtnText: {
    color: appColors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: appColors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: appColors.textSecondary,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  bubbleWrap: {
    maxWidth: "80%",
  },
  bubbleWrapMe: {
    alignSelf: "flex-end",
  },
  bubbleWrapOther: {
    alignSelf: "flex-start",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
  },
  bubbleMe: {
    backgroundColor: appColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: appColors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  bubbleTextMe: {
    color: appColors.white,
  },
  bubbleTextOther: {
    color: appColors.text,
  },
  chatImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextMe: {
    color: appColors.whiteA70,
  },
  timeTextOther: {
    color: appColors.textMuted,
  },
  photoPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    gap: 8,
  },
  previewThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  previewName: {
    flex: 1,
    fontSize: 12,
    color: appColors.primary,
    fontWeight: "600",
  },
  removePhotoBtn: {
    padding: 6,
  },
  removePhotoText: {
    fontSize: 14,
    color: appColors.danger,
    fontWeight: "700",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.white,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    gap: 8,
  },
  completedChatBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    gap: 12,
  },
  lockIconCircle: {
    width: 38,
    height: 38,


    justifyContent: "center",
    alignItems: "center",
  },
  lockIcon: {
    fontSize: 18,
  },
  completedChatTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.textSecondary,
  },
  completedChatSub: {
    fontSize: 12,
    color: appColors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  rateFromChatBtn: {
    backgroundColor: appColors.gold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: appColors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 2,
  },
  rateFromChatBtnText: {
    color: appColors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  attachBtn: {
    padding: 8,
  },
  attachBtnText: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    backgroundColor: appColors.background,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: appColors.text,
    maxHeight: 90,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  sendBtn: {
    backgroundColor: appColors.gold,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: appColors.black,
    fontSize: 13,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: appColors.blackA90,
    justifyContent: "center",
    alignItems: "center",
  },
  closeZoomBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  closeZoomText: {
    color: appColors.white,
    fontSize: 24,
    fontWeight: "700",
  },
  zoomImage: {
    width: "90%",
    height: "80%",
  },
});
