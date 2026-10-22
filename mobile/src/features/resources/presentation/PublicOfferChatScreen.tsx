import { colors as appColors } from "../../../core/ui/theme";
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
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ImageSourceModal } from "../../../core/components/ImageSourceModal";
import { useSessionStore } from "../../../core/auth/session";
import { ChatHistorySkeleton } from "../../../core/components/Skeleton";
import { API_BASE_URL } from "../../../core/network/apiClient";
import { fetchPublicResourceOfferChatMessages, sendPublicResourceOfferChatMessage } from "../data/resourcesApi";
import type { PublicResourceOfferChatMessage } from "../resources";

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

export default function PublicOfferChatScreen() {
  const insets = useSafeAreaInsets();
  const { offerId, resourceTitle } = useLocalSearchParams<{ offerId: string; resourceTitle?: string }>();
  const publicOfferId = Number(offerId);
  const accessToken = useSessionStore((state) => state.accessToken);
  const currentUser = useSessionStore((state) => state.user);
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<PublicResourceOfferChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);

  const addMessage = (message: PublicResourceOfferChatMessage) => {
    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message].sort((first, second) => first.id - second.id),
    );
  };

  const syncMessages = useCallback(async () => {
    if (!Number.isInteger(publicOfferId)) return;
    try {
      const response = await fetchPublicResourceOfferChatMessages(publicOfferId);
      if (response?.results) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newItems = response.results.filter((m) => !existingIds.has(m.id));
          if (newItems.length === 0) return prev;
          return [...prev, ...newItems];
        });
      }
    } catch {}
  }, [publicOfferId]);

  useEffect(() => {
    if (!Number.isInteger(publicOfferId) || !accessToken) {
      setErrorMessage("This chat link is invalid.");
      setIsLoading(false);
      return;
    }

    let active = true;

    async function initializeChat() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await fetchPublicResourceOfferChatMessages(publicOfferId);
        if (!active) return;
        setMessages(response.results);
      } catch {
        if (!active) return;
        setErrorMessage("Could not load previous messages.");
      } finally {
        if (active) setIsLoading(false);
      }

      const socket = new WebSocket(
        `${websocketBaseUrl()}/ws/resources/wanted/chat/${publicOfferId}/?token=${encodeURIComponent(accessToken || "")}`,
      );
      socketRef.current = socket;

      socket.onopen = () => {
        if (!active) return;
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "chat_message" && data.message) {
            addMessage(data.message);
          }
        } catch {}
      };

      socket.onclose = () => {
        if (!active) return;
        setIsConnected(false);
      };
    }

    void initializeChat();

    const pollingInterval = setInterval(() => {
      if (active) void syncMessages();
    }, 4000);

    return () => {
      active = false;
      clearInterval(pollingInterval);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [accessToken, publicOfferId, syncMessages]);

  const sendMessage = async () => {
    const textToSend = draft.trim();
    if (!textToSend && !selectedImage) return;

    setIsSending(true);
    try {
      if (selectedImage) {
        const createdMessage = await sendPublicResourceOfferChatMessage(
          publicOfferId,
          { body: textToSend || "", image: selectedImage },
        );
        addMessage(createdMessage);
        setSelectedImage(null);
        setDraft("");
      } else if (socketRef.current && isConnected) {
        socketRef.current.send(
          JSON.stringify({
            type: "chat_message",
            body: textToSend,
          }),
        );
        setDraft("");
      } else {
        const createdMessage = await sendPublicResourceOfferChatMessage(
          publicOfferId,
          { body: textToSend },
        );
        addMessage(createdMessage);
        setDraft("");
      }
    } catch {
      setErrorMessage("Could not send your message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const renderItem = ({ item }: { item: PublicResourceOfferChatMessage }) => {
    const isMine = item.sender_id === currentUser?.id;
    const imageUrl = getImageUrl(item.image);

    return (
      <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.otherMessage]}>
        {!isMine ? <Text style={styles.senderName}>{item.sender_name}</Text> : null}
        {imageUrl ? (
          <Pressable onPress={() => setViewerImageUrl(imageUrl)}>
            <Image source={{ uri: imageUrl }} style={styles.bubbleImage} />
          </Pressable>
        ) : null}
        {item.body ? (
          <Text
            style={[
              styles.messageText,
              isMine ? styles.myMessageText : styles.otherMessageText,
              Boolean(imageUrl) && styles.captionText,
            ]}
          >
            {item.body}
          </Text>
        ) : null}
        <Text style={[styles.messageTime, isMine ? styles.myMessageTime : styles.otherMessageTime]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    );
  };

  const canSend = Boolean(draft.trim()) || Boolean(selectedImage);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Top Navigation Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={() => goBack("/(app)/resources")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <View style={styles.navTitleWrap}>
          <Text style={styles.topNavTitle} numberOfLines={1}>
            {resourceTitle || "Offer Chat"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons name="circle" size={8} color={isConnected ? "#22C55E" : appColors.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.topNavSub}>
              {isConnected ? "Connected Live" : "Offline Sync"}
            </Text>
          </View>
        </View>
        <View style={{ width: 45 }} />
      </View>

      {errorMessage ? (
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 8 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 4 }} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <ChatHistorySkeleton />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            messages.length === 0 ? styles.emptyList : styles.messageList,
            { paddingBottom: 16 },
          ]}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No messages yet. Chat with the student to finalize exchange!</Text>
          }
          renderItem={renderItem}
        />
      )}

      {selectedImage ? (
        <View style={styles.attachPreview}>
          <Image source={{ uri: selectedImage.uri }} style={styles.attachThumb} />
          <Pressable style={styles.removeAttachButton} onPress={() => setSelectedImage(null)}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="close" size={14} color="#B91C1C" style={{ marginRight: 4 }} />
              <Text style={styles.removeAttachText}>Remove Photo</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {/* Composer */}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom + 8, 14) }]}>
        <Pressable style={styles.attachButton} onPress={() => setIsImagePickerOpen(true)}>
          <MaterialCommunityIcons name="camera-outline" size={20} color={appColors.primary} />
        </Pressable>
        <TextInput
          style={styles.composerInput}
          placeholder={selectedImage ? "Add a caption (optional)" : "Write a message..."}
          placeholderTextColor={appColors.textMuted}
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
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </Pressable>
      </View>

      {/* Full-screen Photo Viewer Modal */}
      <Modal visible={Boolean(viewerImageUrl)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalCloseButton} onPress={() => setViewerImageUrl(null)}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="close" size={16} color="#ffffff" style={{ marginRight: 4 }} />
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
  container: {
    backgroundColor: appColors.background,
    flex: 1,
  },
  topNavBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
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
  navTitleWrap: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  topNavTitle: {
    color: appColors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  topNavSub: {
    color: appColors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  errorText: {
    color: "#b91c1c",
    paddingHorizontal: 16,
    paddingTop: 8,
    fontSize: 12,
  },
  messageList: {
    padding: 16,
    gap: 10,
  },
  emptyList: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: appColors.textSecondary,
    textAlign: "center",
    fontSize: 13,
  },
  messageBubble: {
    borderRadius: 14,
    maxWidth: "80%",
    padding: 12,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: appColors.primary,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderColor: appColors.border,
    borderWidth: 1,
  },
  senderName: {
    color: appColors.primary,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  myMessageText: {
    color: "#ffffff",
  },
  otherMessageText: {
    color: appColors.text,
  },
  captionText: {
    marginTop: 6,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  myMessageTime: {
    color: "#FDBF1E",
    alignSelf: "flex-end",
  },
  otherMessageTime: {
    color: appColors.textMuted,
  },
  bubbleImage: {
    width: 220,
    height: 160,
    borderRadius: 10,
    resizeMode: "cover",
  },
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
  attachThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  removeAttachButton: {
    padding: 8,
  },
  removeAttachText: {
    color: "#b91c1c",
    fontWeight: "700",
    fontSize: 13,
  },
  composer: {
    alignItems: "flex-end",
    backgroundColor: "#ffffff",
    borderTopColor: appColors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  attachButton: {
    backgroundColor: appColors.border,
    borderColor: appColors.border,
    borderWidth: 1,
    borderRadius: 10,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  attachButtonText: {
    fontSize: 20,
  },
  composerInput: {
    borderColor: appColors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    maxHeight: 100,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: appColors.background,
    color: appColors.text,
  },
  sendButton: {
    backgroundColor: "#FDBF1E",
    borderRadius: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: appColors.border,
  },
  sendButtonText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
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
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  modalCloseText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  modalImage: {
    width: "100%",
    height: "80%",
  },
});
