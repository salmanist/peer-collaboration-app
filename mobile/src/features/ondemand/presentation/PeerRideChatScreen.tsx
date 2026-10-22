import { colors as appColors } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ImageSourceModal } from "../../../core/components/ImageSourceModal";
import { useSessionStore } from "../../../core/auth/session";
import { ChatHistorySkeleton } from "../../../core/components/Skeleton";
import { API_BASE_URL } from "../../../core/network/apiClient";
import {
  fetchPeerRideChatMessages,
  sendPeerRideChatMessage,
  type PeerRideChatMessage,
} from "../data/ondemandApi";

function websocketBaseUrl() {
  return API_BASE_URL.replace(/^http/, "ws").replace(/\/api\/?$/, "");
}

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

export function PeerRideChatScreen() {
  const { requestId, partnerName, routeSummary } = useLocalSearchParams<{
    requestId: string;
    partnerName?: string;
    routeSummary?: string;
  }>();
  const parsedRequestId = Number(requestId);
  const accessToken = useSessionStore((state) => state.accessToken);
  const currentUser = useSessionStore((state) => state.user);
  const socketRef = useRef<WebSocket | null>(null);

  const [messages, setMessages] = useState<PeerRideChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  const addMessage = useCallback((message: PeerRideChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) return current;
      return [...current, message].sort((first, second) => first.id - second.id);
    });
  }, []);

  const syncMessages = useCallback(async () => {
    if (!Number.isInteger(parsedRequestId)) return;
    try {
      const response = await fetchPeerRideChatMessages(parsedRequestId);
      if (response?.results) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newItems = response.results.filter((m) => !existingIds.has(m.id));
          if (newItems.length === 0) return prev;
          return [...prev, ...newItems].sort((a, b) => a.id - b.id);
        });
      }
    } catch {}
  }, [parsedRequestId]);

  useEffect(() => {
    if (!Number.isInteger(parsedRequestId) || !accessToken) {
      setErrorMessage("This chat link is invalid.");
      setIsLoading(false);
      return;
    }

    let isActive = true;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSocket = () => {
      if (!isActive) return;
      try {
        const socket = new WebSocket(
          `${websocketBaseUrl()}/ws/ondemand/peer-requests/${parsedRequestId}/chat/?token=${encodeURIComponent(accessToken)}`,
        );
        socketRef.current = socket;

        socket.onopen = () => {
          if (isActive) setIsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "message" && payload.message) {
              addMessage(payload.message as PeerRideChatMessage);
            }
            if (payload.type === "error" && isActive) {
              setErrorMessage(payload.detail);
            }
          } catch {}
        };

        socket.onclose = () => {
          if (isActive) {
            setIsConnected(false);
            reconnectTimeout = setTimeout(connectSocket, 3000);
          }
        };

        socket.onerror = () => {
          if (isActive) setIsConnected(false);
        };
      } catch {
        if (isActive) {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connectSocket, 3000);
        }
      }
    };

    const startChat = async () => {
      try {
        const response = await fetchPeerRideChatMessages(parsedRequestId);
        if (!isActive) return;
        setMessages(response.results);
        connectSocket();
      } catch {
        if (isActive) setErrorMessage("Could not load this ride chat. Please try again.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void startChat();

    // Fast polling fallback to guarantee immediate delivery across mobile clients
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
  }, [accessToken, parsedRequestId, addMessage, syncMessages]);

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body && !selectedImage) return;

    setIsSending(true);
    const photoToSend = selectedImage;
    const textToSend = body;
    setDraft("");
    setSelectedImage(null);

    try {
      if (photoToSend) {
        const newMsg = await sendPeerRideChatMessage(parsedRequestId, {
          body: textToSend,
          imageUri: photoToSend.uri,
        });
        if (newMsg) {
          addMessage(newMsg);
        }
      } else if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ body: textToSend }));
      } else {
        const newMsg = await sendPeerRideChatMessage(parsedRequestId, { body: textToSend });
        if (newMsg) {
          addMessage(newMsg);
        }
      }
      setErrorMessage("");
    } catch (err: any) {
      const errorDetail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.message ||
        "Could not send message. Please try again.";
      setErrorMessage(typeof errorDetail === "string" ? errorDetail : JSON.stringify(errorDetail));
    } finally {
      setIsSending(false);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    setIsImagePickerOpen(false);
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage("Photo permission is required to send images in chat.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (!result.canceled && result.assets[0]?.uri) {
      setSelectedImage({ uri: result.assets[0].uri });
    }
  };

  const canSend = (draft.trim().length > 0 || selectedImage !== null) && !isSending;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => goBack("/(app)/rides")}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Ride Live Chat</Text>
            <Text style={styles.summary} numberOfLines={1}>
              Connecting to campus peer ride…
            </Text>
          </View>
        </View>
        <ChatHistorySkeleton />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => goBack("/(app)/rides")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.title}>{partnerName || "Peer Ride Chat"}</Text>
            <View style={[styles.liveDot, isConnected && styles.liveDotOnline]} />
          </View>
          <Text style={styles.summary} numberOfLines={1}>
            {routeSummary ? `Trip: ${routeSummary}` : "Live coordination for your ride"}
          </Text>
        </View>
      </View>

      {/* Error banner */}
      {!!errorMessage && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isMine = item.sender_id === currentUser?.id;
          const imgUrl = getImageUrl(item.image);
          return (
            <View style={[styles.bubbleRow, isMine ? styles.myBubbleRow : styles.otherBubbleRow]}>
              <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
                {!isMine && <Text style={styles.senderName}>{item.sender_name}</Text>}
                {!!item.body && (
                  <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.otherMessageText]}>
                    {item.body}
                  </Text>
                )}
                {!!imgUrl && (
                  <Pressable onPress={() => setViewerImageUrl(imgUrl)} style={{ marginTop: 4 }}>
                    <Image source={{ uri: imgUrl }} style={styles.chatImage} resizeMode="cover" />
                  </Pressable>
                )}
                <Text style={[styles.timeText, isMine ? styles.myTimeText : styles.otherTimeText]}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chat-outline" size={44} color={appColors.textSecondary} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>Live Ride Chat</Text>
            <Text style={styles.emptySub}>
              Say hello and coordinate your exact pickup point with your peer!
            </Text>
          </View>
        }
      />

      {/* Selected Image Preview */}
      {selectedImage && (
        <View style={styles.imagePreviewWrap}>
          <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
          <Pressable style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
            <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <Pressable
          style={styles.attachBtn}
          onPress={() => setIsImagePickerOpen(true)}
        >
          <MaterialCommunityIcons name="camera-outline" size={22} color={appColors.primary} />
        </Pressable>
        <TextInput
          style={styles.textInput}
          placeholder="Message peer…"
          value={draft}
          onChangeText={setDraft}
          placeholderTextColor={appColors.textMuted}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!canSend}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {/* Image Picker Modal */}
      <ImageSourceModal
        visible={isImagePickerOpen}
        onClose={() => setIsImagePickerOpen(false)}
        onImageSelected={(img) => {
          setIsImagePickerOpen(false);
          setSelectedImage({ uri: img.uri });
        }}
      />

      {/* Fullscreen Viewer */}
      {viewerImageUrl && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setViewerImageUrl(null)}>
          <View style={styles.fullViewerBackdrop}>
            <Pressable style={styles.closeViewerBtn} onPress={() => setViewerImageUrl(null)}>
              <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <Image source={{ uri: viewerImageUrl }} style={styles.fullImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: appColors.border,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.text,
  },
  summary: {
    fontSize: 12,
    color: appColors.textSecondary,
    marginTop: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#CBD5E1",
  },
  liveDotOnline: {
    backgroundColor: "#16A34A",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#FEE2E2",
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 10,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  myBubbleRow: {
    justifyContent: "flex-end",
  },
  otherBubbleRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  myBubble: {
    backgroundColor: appColors.primary,
    borderBottomRightRadius: 3,
  },
  otherBubble: {
    backgroundColor: appColors.surfaceMuted,
    borderWidth: 1,
    borderColor: appColors.border,
    borderBottomLeftRadius: 3,
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
    marginBottom: 3,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: appColors.text,
  },
  chatImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  myTimeText: {
    color: "rgba(255,255,255,0.75)",
  },
  otherTimeText: {
    color: appColors.textMuted,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: appColors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  imagePreviewWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    left: 60,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: appColors.border,
  },
  attachBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    backgroundColor: appColors.surfaceMuted,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: appColors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: appColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  fullViewerBackdrop: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  closeViewerBtn: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
});
