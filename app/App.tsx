import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { push, query, ref, limitToLast, onValue } from "firebase/database";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import { db } from "./src/firebase";
import { validateMessageUnderstandability } from "./src/messageValidation";

type ChatMessage = {
  id: string;
  text: string;
  createdAt: number;
  userId: string;
};

type RawMessage = {
  text?: unknown;
  createdAt?: unknown;
  userId?: unknown;
};

const currentUserId = `user-${Math.random().toString(36).slice(2, 10)}`;

function normalizeMessage(id: string, value: RawMessage): ChatMessage | null {
  if (typeof value.text !== "string" || value.text.trim() === "") {
    return null;
  }
  if (typeof value.createdAt !== "number") {
    return null;
  }
  if (typeof value.userId !== "string" || value.userId.trim() === "") {
    return null;
  }

  return {
    id,
    text: value.text,
    createdAt: value.createdAt,
    userId: value.userId,
  };
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [validatingMessage, setValidatingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const messagesRef = query(ref(db, "messages"), limitToLast(200));

    const unsubscribe = onValue(
      messagesRef,
      (snapshot) => {
        const nextMessages: ChatMessage[] = [];
        const raw = snapshot.val() as Record<string, RawMessage> | null;

        if (raw) {
          Object.entries(raw).forEach(([id, value]) => {
            const normalized = normalizeMessage(id, value);
            if (normalized) {
              nextMessages.push(normalized);
            }
          });
        }

        nextMessages.sort((a, b) => b.createdAt - a.createdAt);
        setMessages(nextMessages);
        setLoading(false);
        setErrorMessage(null);
      },
      (error) => {
        setLoading(false);
        setErrorMessage(`Failed to load messages: ${error.message}`);
      },
    );

    return unsubscribe;
  }, []);

  const canSend = useMemo(
    () => inputValue.trim().length > 0 && !validatingMessage,
    [inputValue, validatingMessage],
  );

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (text.length === 0) {
      setErrorMessage("Message cannot be empty.");
      return;
    }

    setValidatingMessage(true);

    try {
      const validation = await validateMessageUnderstandability(text);

      if (!validation.understandable) {
        setErrorMessage(`Message is not clear enough: ${validation.reason}`);
        return;
      }

      await push(ref(db, "messages"), {
        text,
        createdAt: Date.now(),
        userId: currentUserId,
      });
      setInputValue("");
      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error while validating or sending message";
      setErrorMessage(`Failed to validate/send message: ${message}`);
    } finally {
      setValidatingMessage(false);
    }
  }, [inputValue]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Realtime Chat</Text>
          <Text style={styles.subtitle}>Firebase Realtime Database</Text>
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {validatingMessage ? (
          <Text style={styles.validationInfo}>
            Checking message clarity with Gemini...
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            inverted
            renderItem={({ item }) => {
              const isMine = item.userId === currentUserId;
              return (
                <View
                  style={[
                    styles.messageBubble,
                    isMine ? styles.myMessage : styles.otherMessage,
                  ]}
                >
                  <Text
                    style={[styles.messageText, isMine && styles.myMessageText]}
                  >
                    {item.text}
                  </Text>
                  <Text
                    style={[styles.messageMeta, isMine && styles.myMessageMeta]}
                  >
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyState}>No messages yet. Say hi 👋</Text>
            }
          />
        )}

        <View style={styles.composer}>
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Type a message..."
            style={styles.input}
            autoCorrect
          />
          <Pressable
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!canSend}
          >
            <Text style={styles.sendButtonText}>
              {validatingMessage ? "Checking..." : "Send"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#6b7280",
  },
  error: {
    margin: 12,
    padding: 10,
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    borderRadius: 8,
  },
  validationInfo: {
    marginHorizontal: 12,
    marginBottom: 8,
    color: "#1d4ed8",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#374151",
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 12,
    gap: 10,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 2,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#2563eb",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  messageText: {
    color: "#111827",
    fontSize: 15,
  },
  myMessageText: {
    color: "#ffffff",
  },
  messageMeta: {
    marginTop: 4,
    fontSize: 11,
    color: "#6b7280",
    textAlign: "right",
  },
  myMessageMeta: {
    color: "#dbeafe",
  },
  composer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
  },
  sendButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  emptyState: {
    textAlign: "center",
    color: "#6b7280",
    paddingVertical: 30,
  },
});
