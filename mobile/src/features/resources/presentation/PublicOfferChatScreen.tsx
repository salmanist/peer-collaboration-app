import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSessionStore } from "../../../core/auth/session";
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
  const { offerId, resourceTitle } = useLocalSearchParams<{ offerId: string; resourceTitle?: string }>();
  const publicOfferId = Number(offerId);
  const accessToken = useSessionStore((state) => state.accessToken);
  const currentUser = useSessionStore((state) => state.user);
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<PublicResourceOfferChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ uri: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  const addMessage = (message: PublicResourceOfferChatMessage) => {
    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message].sort((first, second) => first.id - second.id),
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImage({ uri: result.assets[0].uri });
      }
    } catch {
      setErrorMessage("Could not select image.");
    }
  };

  useEffect(() => {
    if (!Number.isInteger(publicOfferId) || !accessToken) {
      setErrorMessage("This chat link is invalid.");
      setIsLoading(false);
      return;
    }
    let isActive = true;

    const startChat = async () => {
      try {
        const response = await fetchPublicResourceOfferChatMessages(publicOfferId);
        if (!isActive) return;
        setMessages(response.results);
        const socket = new WebSocket(
          `${websocketBaseUrl()}/ws/resources/offers/${publicOfferId}/chat/?token=${encodeURIComponent(accessToken)}`,
        );
        socketRef.current = socket;
        socket.onopen = () => {
          if (isActive) setIsConnected(true);
        };
        socket.onmessage = (event) => {
          const payload = JSON.parse(event.data);
          if (payload.type === "message") addMessage(payload.message as PublicResourceOfferChatMessage);
          if (payload.type === "error" && isActive) setErrorMessage(payload.detail);
        };
        socket.onclose = () => {
          if (isActive) setIsConnected(false);
        };
        socket.onerror = () => {
          if (isActive) setErrorMessage("Could not connect to live chat.");
        };
      } catch {
        if (isActive) setErrorMessage("Could not load this chat. It is available only for an accepted offer.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void startChat();
    return () => {
      isActive = false;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [accessToken, publicOfferId]);

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body && !selectedImage) return;

    if (selectedImage) {
      setIsSending(true);
      try {
        const newMsg = await sendPublicResourceOfferChatMessage(publicOfferId, {
          body,
          image: selectedImage,
        });
        if (newMsg) {
          addMessage(newMsg);
        }
        setSelectedImage(null);
        setDraft("");
        setErrorMessage("");
      } catch (err: any) {
        const errorDetail =
          err?.response?.data?.detail ||
          err?.response?.data?.non_field_errors?.[0] ||
          err?.response?.data?.image?.[0] ||
          err?.message ||
          "Could not send photo. Please try again.";
        setErrorMessage(typeof errorDetail === "string" ? errorDetail : JSON.stringify(errorDetail));
      } finally {
        setIsSending(false);
      }
    } else {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(JSON.stringify({ body }));
      setDraft("");
    }
  };


  const canSend = (draft.trim().length > 0 || selectedImage !== null) && (isConnected || selectedImage !== null);

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1d4ed8" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.backLink}>← Back</Text></Pressable>
        <View>
          <Text style={styles.title}>Live chat</Text>
          <Text style={styles.summary}>Arrange how to provide “{resourceTitle || "this resource"}” with the other student.</Text>
          <Text style={styles.connection}>{isConnected ? "Connected" : "Connecting…"}</Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messageList}
        ListEmptyComponent={<Text style={styles.emptyText}>Start arranging this resource exchange.</Text>}
        renderItem={({ item }) => {
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
            <Text style={styles.removeAttachText}>✕ Remove</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable style={styles.attachButton} onPress={() => void pickImage()}>
          <Text style={styles.attachButtonText}>📷</Text>
        </Pressable>
        <TextInput
          style={styles.composerInput}
          placeholder={selectedImage ? "Add a caption (optional)" : "Write a message"}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!canSend || isSending) && styles.sendButtonDisabled]}
          onPress={() => void sendMessage()}
          disabled={!canSend || isSending}
        >
          {isSending ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.sendButtonText}>Send</Text>}
        </Pressable>
      </View>

      {/* Full-screen Photo Viewer Modal */}
      <Modal visible={Boolean(viewerImageUrl)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalCloseButton} onPress={() => setViewerImageUrl(null)}>
            <Text style={styles.modalCloseText}>✕ Close</Text>
          </Pressable>
          {viewerImageUrl ? (
            <Image source={{ uri: viewerImageUrl }} style={styles.modalImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flex: 1, paddingTop: 56 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  header: { alignItems: "center", borderBottomColor: "#e2e8f0", borderBottomWidth: 1, flexDirection: "row", gap: 20, padding: 20 },
  backLink: { color: "#1d4ed8", fontWeight: "700" },
  title: { color: "#0f172a", fontSize: 20, fontWeight: "700" },
  summary: { color: "#475569", fontSize: 12, marginTop: 3 },
  connection: { color: "#64748b", fontSize: 12, marginTop: 2 },
  errorText: { color: "#b91c1c", paddingHorizontal: 20, paddingTop: 10 },
  messageList: { gap: 10, padding: 16 },
  emptyList: { alignItems: "center", flexGrow: 1, justifyContent: "center", padding: 24 },
  emptyText: { color: "#64748b", textAlign: "center" },
  messageBubble: { borderRadius: 12, maxWidth: "80%", padding: 10 },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#1d4ed8" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderWidth: 1 },
  senderName: { color: "#64748b", fontSize: 12, fontWeight: "700", marginBottom: 3 },
  messageText: { color: "#0f172a" },
  myMessageText: { color: "#ffffff" },
  captionText: { marginTop: 6 },
  messageTime: { color: "#64748b", fontSize: 11, marginTop: 4 },
  myMessageTime: { color: "#dbeafe" },
  bubbleImage: { width: 220, height: 160, borderRadius: 8, resizeMode: "cover" },
  attachPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
  },
  attachThumb: { width: 48, height: 48, borderRadius: 6 },
  removeAttachButton: { padding: 8 },
  removeAttachText: { color: "#b91c1c", fontWeight: "700", fontSize: 13 },
  composer: { alignItems: "flex-end", backgroundColor: "#ffffff", borderTopColor: "#e2e8f0", borderTopWidth: 1, flexDirection: "row", gap: 8, padding: 12 },
  attachButton: { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1", borderWidth: 1, borderRadius: 8, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  attachButtonText: { fontSize: 20 },
  composerInput: { borderColor: "#cbd5e1", borderRadius: 8, borderWidth: 1, flex: 1, maxHeight: 100, minHeight: 44, padding: 10 },
  sendButton: { backgroundColor: "#1d4ed8", borderRadius: 8, paddingHorizontal: 14, minHeight: 44, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { backgroundColor: "#94a3b8" },
  sendButtonText: { color: "#ffffff", fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCloseButton: { position: "absolute", top: 48, right: 20, zIndex: 10, padding: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  modalCloseText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  modalImage: { width: "100%", height: "80%" },
});

