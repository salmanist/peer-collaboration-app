import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
} from "react-native";

import { useSessionStore } from "../../../core/auth/session";
import { API_BASE_URL } from "../../../core/network/apiClient";
import { fetchResourceChatMessages } from "../data/resourcesApi";
import type { ResourceChatMessage } from "../resources";

function websocketBaseUrl() {
  return API_BASE_URL.replace(/^http/, "ws").replace(/\/api\/?$/, "");
}

export default function ResourceChatScreen() {
  const { requestId, resourceTitle } = useLocalSearchParams<{ requestId: string; resourceTitle?: string }>();
  const interestRequestId = Number(requestId);
  const accessToken = useSessionStore((state) => state.accessToken);
  const currentUser = useSessionStore((state) => state.user);
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ResourceChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!Number.isInteger(interestRequestId) || !accessToken) {
      setErrorMessage("This chat link is invalid.");
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const addMessage = (message: ResourceChatMessage) => {
      if (!isActive) return;
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        return [...current, message].sort((first, second) => first.id - second.id);
      });
    };

    const startChat = async () => {
      try {
        const response = await fetchResourceChatMessages(interestRequestId);
        if (!isActive) return;
        setMessages(response.results);

        const socket = new WebSocket(
          `${websocketBaseUrl()}/ws/resources/requests/${interestRequestId}/chat/?token=${encodeURIComponent(accessToken)}`,
        );
        socketRef.current = socket;
        socket.onopen = () => { if (isActive) setIsConnected(true); };
        socket.onmessage = (event) => {
          const payload = JSON.parse(event.data);
          if (payload.type === "message") addMessage(payload.message as ResourceChatMessage);
          if (payload.type === "error" && isActive) setErrorMessage(payload.detail);
        };
        socket.onclose = () => { if (isActive) setIsConnected(false); };
        socket.onerror = () => { if (isActive) setErrorMessage("Could not connect to live chat."); };
      } catch {
        if (isActive) setErrorMessage("Could not load this chat. It is available only for an accepted request.");
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
  }, [accessToken, interestRequestId]);

  const sendMessage = () => {
    const body = draft.trim();
    if (!body || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ body }));
    setDraft("");
  };

  if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1d4ed8" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.backLink}>← Back</Text></Pressable>
        <View>
          <Text style={styles.title}>Live chat</Text>
          <Text style={styles.summary}>Discuss how to exchange “{resourceTitle || "this resource"}” with the other student.</Text>
          <Text style={styles.connection}>{isConnected ? "Connected" : "Connecting…"}</Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messageList}
        ListEmptyComponent={<Text style={styles.emptyText}>Start the conversation about this resource.</Text>}
        renderItem={({ item }) => {
          const isMine = item.sender_id === currentUser?.id;
          return (
            <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.otherMessage]}>
              {!isMine ? <Text style={styles.senderName}>{item.sender_name}</Text> : null}
              <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.body}</Text>
              <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextInput style={styles.composerInput} placeholder="Write a message" value={draft} onChangeText={setDraft} multiline />
        <Pressable style={[styles.sendButton, (!draft.trim() || !isConnected) && styles.sendButtonDisabled]} onPress={sendMessage} disabled={!draft.trim() || !isConnected}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f8fafc", flex: 1, paddingTop: 56 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  header: { alignItems: "center", borderBottomColor: "#e2e8f0", borderBottomWidth: 1, flexDirection: "row", gap: 20, padding: 20 },
  backLink: { color: "#1d4ed8", fontWeight: "700" }, title: { color: "#0f172a", fontSize: 20, fontWeight: "700" }, summary: { color: "#475569", fontSize: 12, marginTop: 3 }, connection: { color: "#64748b", fontSize: 12, marginTop: 2 },
  errorText: { color: "#b91c1c", paddingHorizontal: 20, paddingTop: 10 },
  messageList: { padding: 16, gap: 10 }, emptyList: { alignItems: "center", flexGrow: 1, justifyContent: "center", padding: 24 }, emptyText: { color: "#64748b", textAlign: "center" },
  messageBubble: { borderRadius: 12, maxWidth: "80%", padding: 10 }, myMessage: { alignSelf: "flex-end", backgroundColor: "#1d4ed8" }, otherMessage: { alignSelf: "flex-start", backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderWidth: 1 },
  senderName: { color: "#64748b", fontSize: 12, fontWeight: "700", marginBottom: 3 }, messageText: { color: "#0f172a" }, myMessageText: { color: "#ffffff" }, messageTime: { color: "#64748b", fontSize: 11, marginTop: 4 }, myMessageTime: { color: "#dbeafe" },
  composer: { alignItems: "flex-end", backgroundColor: "#ffffff", borderTopColor: "#e2e8f0", borderTopWidth: 1, flexDirection: "row", gap: 10, padding: 12 }, composerInput: { borderColor: "#cbd5e1", borderRadius: 8, borderWidth: 1, flex: 1, maxHeight: 100, minHeight: 44, padding: 10 }, sendButton: { backgroundColor: "#1d4ed8", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13 }, sendButtonDisabled: { backgroundColor: "#94a3b8" }, sendButtonText: { color: "#ffffff", fontWeight: "700" },
});
