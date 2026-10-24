import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
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
import { fetchItemClaimChatMessages, sendItemClaimChatMessage } from "../data/lostAndFoundApi";
import type { ItemClaimChatMessage } from "../lostAndFound";

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

export default function ClaimChatScreen() {
  const { claimId, itemTitle } = useLocalSearchParams<{ claimId: string; itemTitle?: string }>();
  const parsedClaimId = Number(claimId);
  const accessToken = useSessionStore((state) => state.accessToken);
  const currentUser = useSessionStore((state) => state.user);
  const socketRef = useRef<WebSocket | null>(null);

  const [messages, setMessages] = useState<ItemClaimChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  const addMessage = (message: ItemClaimChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) return current;
      return [...current, message].sort((first, second) => first.id - second.id);
    });
  };

  const syncMessages = useCallback(async () => {
    if (!Number.isInteger(parsedClaimId)) return;
    try {
      const response = await fetchItemClaimChatMessages(parsedClaimId);
      if (response?.results) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newItems = response.results.filter((m) => !existingIds.has(m.id));
          if (newItems.length === 0) return prev;
          return [...prev, ...newItems];
        });
      }
    } catch {}
  }, [parsedClaimId]);

  useEffect(() => {
    if (!Number.isInteger(parsedClaimId) || !accessToken) {
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
          `${websocketBaseUrl()}/ws/lost-and-found/claims/${parsedClaimId}/chat/?token=${encodeURIComponent(accessToken)}`,
        );
        socketRef.current = socket;

        socket.onopen = () => {
          if (isActive) setIsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "message" && payload.message) {
              addMessage(payload.message as ItemClaimChatMessage);
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
        const response = await fetchItemClaimChatMessages(parsedClaimId);
        if (!isActive) return;
        setMessages(response.results);
        connectSocket();
      } catch {
        if (isActive) setErrorMessage("Could not load this chat. It is available only for accepted claims.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void startChat();

    // Fast polling fallback to guarantee immediate delivery across clients
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
  }, [accessToken, parsedClaimId, addMessage, syncMessages]);

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
        const newMsg = await sendItemClaimChatMessage(parsedClaimId, {
          body: textToSend,
          image: photoToSend,
        });
        if (newMsg) {
          addMessage(newMsg);
        }
      } else if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ body: textToSend }));
      } else {
        const newMsg = await sendItemClaimChatMessage(parsedClaimId, { body: textToSend });
        if (newMsg) {
          addMessage(newMsg);
        }
      }
      setErrorMessage("");
    } catch (err: any) {
      const errorDetail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.image?.[0] ||
        err?.message ||
        "Could not send message. Please try again.";
      setErrorMessage(typeof errorDetail === "string" ? errorDetail : JSON.stringify(errorDetail));
    } finally {
      setIsSending(false);
    }
  };

  const canSend = (draft.trim().length > 0 || selectedImage !== null) && !isSending;


  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: appColors.headerControlBg, borderWidth: 1, borderColor: appColors.headerControlBorder, alignItems: "center", justifyContent: "center" }}
            onPress={() => goBack("/(app)/lost-and-found")}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.onHeader} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Handover Live Chat</Text>
            <Text style={styles.summary} numberOfLines={1}>
              Coordinating handover for “{itemTitle || "this item"}”
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
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: appColors.headerControlBg, borderWidth: 1, borderColor: appColors.headerControlBorder, alignItems: "center", justifyContent: "center" }}
          onPress={() => goBack("/(app)/lost-and-found")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Handover Live Chat</Text>
          <Text style={styles.summary} numberOfLines={1}>
            Coordinating handover for “{itemTitle || "this item"}”
          </Text>
          <Text style={styles.connection}>{isConnected ? "Connected" : "Connecting…"}</Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messageList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Start coordinating handover time and location with the other student.
          </Text>
        }
        renderItem={({ item }) => {
          const isMine = item.sender_id === currentUser?.id;
          const imageUrl = getImageUrl(item.image);
          return (
            <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.otherMessage]}>
              {!isMine ? <Text style={styles.senderName}>{item.sender_name}</Text> : null}
              {imageUrl ? (
                <Pressable onPress={() => setViewerImageUrl(imageUrl)}>
                  <Image source={{ uri: imageUrl }} style={styles.bubbleImage} resizeMode="cover" />
                </Pressable>
              ) : null}
              {item.body ? (
                <Text style={[styles.messageText, isMine && styles.myMessageText, imageUrl ? styles.captionText : null]}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          );
        }}
      />

      {selectedImage ? (
        <View style={styles.attachPreview}>
          <Image source={{ uri: selectedImage.uri }} style={styles.attachThumb} />
          <Pressable style={styles.removeAttachButton} onPress={() => setSelectedImage(null)}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="close" size={14} color={appColors.danger} style={{ marginRight: 4 }} />
              <Text style={styles.removeAttachText}>Remove</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable style={styles.attachButton} onPress={() => setIsImagePickerOpen(true)}>
          <MaterialCommunityIcons name="camera-outline" size={20} color={appColors.primary} />
        </Pressable>
        <TextInput
          style={styles.composerInput}
          placeholder={selectedImage ? "Add a caption (optional)" : "Write a message..."}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!canSend || isSending) && styles.sendButtonDisabled]}
          onPress={() => void sendMessage()}
          disabled={!canSend || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={appColors.white} />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </Pressable>
      </View>

      {/* Full-screen Photo Viewer */}
      <Modal visible={Boolean(viewerImageUrl)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalCloseButton} onPress={() => setViewerImageUrl(null)}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="close" size={16} color={appColors.white} style={{ marginRight: 4 }} />
              <Text style={styles.modalCloseText}>Close</Text>
            </View>
          </Pressable>
          {viewerImageUrl ? (
            <Image source={{ uri: viewerImageUrl }} style={styles.modalImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>

      <ImageSourceModal
        visible={isImagePickerOpen}
        onClose={() => setIsImagePickerOpen(false)}
        onImageSelected={(img) => setSelectedImage({ uri: img.uri })}
        title="Send a Photo"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: appColors.background, flex: 1 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  header: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    alignItems: "center",
    backgroundColor: appColors.headerBg,
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14 + headerGrow,
  },
  backLink: { color: appColors.primary, fontWeight: "700" },
  title: { color: appColors.onHeader, fontSize: 18, fontWeight: "700" },
  summary: { color: appColors.onHeaderMuted, fontSize: 12, marginTop: 2 },
  connection: { color: appColors.onHeaderMuted, fontSize: 11, marginTop: 1 },
  errorText: { color: appColors.red700, paddingHorizontal: 20, paddingTop: 10, fontSize: 13 },
  messageList: { padding: 16, gap: 10 },
  emptyList: { alignItems: "center", flexGrow: 1, justifyContent: "center", padding: 24 },
  emptyText: { color: appColors.textSecondary, textAlign: "center", fontSize: 13 },
  messageBubble: { borderRadius: 12, maxWidth: "80%", padding: 10 },
  myMessage: { alignSelf: "flex-end", backgroundColor: appColors.primary },
  otherMessage: { alignSelf: "flex-start", backgroundColor: appColors.white, borderColor: appColors.border, borderWidth: 1 },
  senderName: { color: appColors.textSecondary, fontSize: 12, fontWeight: "700", marginBottom: 3 },
  messageText: { color: appColors.text, fontSize: 14 },
  myMessageText: { color: appColors.onHeader },
  captionText: { marginTop: 6 },
  messageTime: { color: appColors.textSecondary, fontSize: 11, marginTop: 4 },
  myMessageTime: { color: appColors.surfaceMuted },
  bubbleImage: { width: 220, height: 160, borderRadius: 8 },
  attachPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: appColors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopColor: appColors.border,
    borderTopWidth: 1,
  },
  attachThumb: { width: 48, height: 48, borderRadius: 6 },
  removeAttachButton: { padding: 8 },
  removeAttachText: { color: appColors.red700, fontWeight: "700", fontSize: 13 },
  composer: {
    alignItems: "flex-end",
    backgroundColor: appColors.white,
    borderTopColor: appColors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  attachButton: {
    backgroundColor: appColors.border,
    borderColor: appColors.border,
    borderWidth: 1,
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  attachButtonText: { fontSize: 20 },
  composerInput: {
    borderColor: appColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    maxHeight: 100,
    minHeight: 44,
    padding: 10,
  },
  sendButton: {
    backgroundColor: appColors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: appColors.textMuted },
  sendButtonText: { color: appColors.white, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: appColors.blackA92,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCloseButton: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: appColors.whiteA20,
    borderRadius: 20,
  },
  modalCloseText: { color: appColors.white, fontWeight: "700", fontSize: 15 },
  modalImage: { width: "100%", height: "80%" },
});
