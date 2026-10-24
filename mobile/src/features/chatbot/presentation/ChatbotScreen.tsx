import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { goBack } from "../../../core/navigation/goBack";
import { Text, TextInput } from "../../../core/ui/AppText";
import { colors, headerGrow } from "../../../core/ui/theme";
import FormattedAnswer from "./FormattedAnswer";
import { askChatbot, chatbotErrorMessage, ChatbotSource, MAX_QUESTION_LENGTH } from "../data/chatbotApi";

const COUNTER_FROM = 450;
const WELCOME = "Ask me about university documents. I only answer from the documents I've been given.";
const NOTICE = "AI answers can be wrong. Confirm with the university office. Questions are saved, so don't share personal info.";

interface ChatMessage {
  id: string;
  role: "user" | "bot" | "error" | "thinking";
  text: string;
  sources?: string[];
  question?: string; // set on errors so the question can be retried
}

function sourceLabels(sources: ChatbotSource[]): string[] {
  const labels = sources.map((source) => `${source.document}, page ${source.page}`);
  return [...new Set(labels)];
}

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const idCounter = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome", role: "bot", text: WELCOME }]);
  const [input, setInput] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight || 28 : 20);
  const nextId = () => `m${++idCounter.current}`;

  useEffect(() => {
    // ponytail: short delay lets the new row lay out before scrolling
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [messages]);

  const ask = async (question: string) => {
    setIsWaiting(true);
    const thinkingId = nextId();
    setMessages((current) => [...current, { id: thinkingId, role: "thinking", text: "Thinking..." }]);
    let reply: ChatMessage;
    try {
      const result = await askChatbot(question);
      reply = {
        id: nextId(),
        role: "bot",
        text: result.answer,
        sources: result.was_answered ? sourceLabels(result.sources) : undefined,
      };
    } catch (error) {
      reply = { id: nextId(), role: "error", text: chatbotErrorMessage(error), question };
    }
    setMessages((current) => [...current.filter((message) => message.id !== thinkingId), reply]);
    setIsWaiting(false);
  };

  const send = () => {
    const question = input.trim();
    if (!question || isWaiting) return;
    setInput("");
    setMessages((current) => [...current, { id: nextId(), role: "user", text: question }]);
    void ask(question);
  };

  const retry = (errorMessage: ChatMessage) => {
    if (!errorMessage.question || isWaiting) return;
    setMessages((current) => current.filter((message) => message.id !== errorMessage.id));
    void ask(errorMessage.question);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.role === "user") {
      return (
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={styles.textUser}>{item.text}</Text>
        </View>
      );
    }
    if (item.role === "thinking") {
      return (
        <View style={[styles.bubble, styles.bubbleBot, styles.thinkingRow]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.textBot}>{item.text}</Text>
        </View>
      );
    }
    if (item.role === "error") {
      return (
        <View style={[styles.bubble, styles.bubbleError]}>
          <Text style={styles.textError}>{item.text}</Text>
          {item.question ? (
            <Pressable style={styles.retryButton} onPress={() => retry(item)} disabled={isWaiting} accessibilityRole="button">
              <MaterialCommunityIcons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }
    return (
      <View style={[styles.bubble, styles.bubbleBot]}>
        <FormattedAnswer text={item.text} />
        {item.sources?.length ? <Text style={styles.sources}>Sources: {item.sources.join("; ")}</Text> : null}
      </View>
    );
  };

  const canSend = input.trim().length > 0 && !isWaiting;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topOffset + 2 }]}>
        <Pressable style={styles.backButton} onPress={() => goBack()} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.onHeader} />
        </Pressable>
        <MaterialCommunityIcons name="robot-outline" size={22} color={colors.onHeader} />
        <Text style={styles.title}>University Assistant</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom + 2, 6) }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask a question..."
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_QUESTION_LENGTH}
            multiline
          />
          <Pressable
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={send}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send question"
          >
            <MaterialCommunityIcons name="send" size={20} color={colors.primary} />
          </Pressable>
        </View>
        {input.length >= COUNTER_FROM ? (
          <Text style={styles.counter}>{input.length}/{MAX_QUESTION_LENGTH}</Text>
        ) : null}
        <Text style={styles.notice}>{NOTICE}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: {
    borderTopWidth: headerGrow,
    borderTopColor: colors.headerBg,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12 + headerGrow,
    backgroundColor: colors.headerBg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.headerControlBg,
    borderWidth: 1,
    borderColor: colors.headerControlBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.onHeader, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  bubble: { maxWidth: "85%", borderRadius: 16, padding: 12 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleBot: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  bubbleError: {
    alignSelf: "flex-start",
    backgroundColor: colors.dangerBg,
    borderBottomLeftRadius: 4,
    gap: 8,
  },
  thinkingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  textUser: { color: colors.white, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  textBot: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  textError: { color: colors.danger, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  sources: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 8 },
  retryButton: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  retryText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  composer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 3,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    maxHeight: 76,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
  counter: { alignSelf: "flex-end", color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  notice: { color: colors.textMuted, fontSize: 10, lineHeight: 13, fontWeight: "500" },
});
