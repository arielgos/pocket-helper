import {
  push,
  query,
  ref,
  limitToLast,
  onValue,
  set,
  get,
  off,
} from "firebase/database";
import { db } from "../firebase";
import { ChatMessage, RawChatMessage, MessageType } from "../types/chat";
import { saveMessageToSession, clearSessionMessages } from "./sessionService";
import { MAX_MESSAGES_TO_LOAD } from "../constants/chat";

function parseMessageType(rawType: unknown): MessageType {
  if (typeof rawType !== "string") {
    return MessageType.Message;
  }

  const typeMap: Record<string, MessageType> = {
    message: MessageType.Message,
    post: MessageType.Post,
    echo: MessageType.Echo,
    process: MessageType.Process,
  };

  return typeMap[rawType] ?? MessageType.Message;
}

function normalizeMessage(
  id: string,
  value: RawChatMessage,
): ChatMessage | null {
  if (typeof value.text !== "string" || value.text.trim() === "") {
    return null;
  }

  if (typeof value.createdAt !== "number") {
    return null;
  }

  if (typeof value.userId !== "string" || value.userId.trim() === "") {
    return null;
  }

  const messageType = parseMessageType(value.type);

  return {
    id,
    text: value.text,
    createdAt: value.createdAt,
    userId: value.userId,
    sessionId: value.sessionId as string | undefined,
    type: messageType,
  };
}

export function createCurrentUserId(): string {
  return "arielgos";
}

// Subscribe to messages from a specific session
export function subscribeToSessionMessages(
  sessionId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError: (message: string) => void,
): () => void {
  const messagesRef = query(
    ref(db, `sessions/${sessionId}/messages`),
    limitToLast(MAX_MESSAGES_TO_LOAD),
  );

  const unsubscribe = onValue(
    messagesRef,
    (snapshot) => {
      const nextMessages: ChatMessage[] = [];
      const raw = snapshot.val() as Record<string, RawChatMessage> | null;

      if (raw) {
        Object.entries(raw).forEach(([id, value]) => {
          const normalized = normalizeMessage(id, value);
          if (normalized) {
            nextMessages.push(normalized);
          }
        });
      }

      nextMessages.sort((a, b) => b.createdAt - a.createdAt);
      onMessages(nextMessages);
    },
    (error) => {
      onError(error.message);
    },
  );

  // Return proper cleanup function
  return () => {
    off(messagesRef);
  };
}

// Deprecated: kept for backward compatibility
export function subscribeToChatMessages(
  onMessages: (messages: ChatMessage[]) => void,
  onError: (message: string) => void,
): () => void {
  console.warn(
    "subscribeToChatMessages is deprecated. Use subscribeToSessionMessages instead.",
  );
  return subscribeToSessionMessages("default", onMessages, onError);
}

export async function sendChatMessage(params: {
  text: string;
  userId: string;
  sessionId: string;
  type?: MessageType;
}): Promise<void> {
  // Only save to session-specific storage
  const newMessage: ChatMessage = {
    id: Date.now().toString(),
    text: params.text,
    createdAt: Date.now(),
    userId: params.userId,
    sessionId: params.sessionId,
    type: params.type || MessageType.Message,
  };

  await saveMessageToSession(params.sessionId, newMessage);
}

export async function clearAllMessages(): Promise<void> {
  console.warn(
    "clearAllMessages is deprecated. Use clearMessagesBySession instead.",
  );
  await clearSessionMessages("default");
}

export async function clearMessagesBySession(sessionId: string): Promise<void> {
  await clearSessionMessages(sessionId);
}
