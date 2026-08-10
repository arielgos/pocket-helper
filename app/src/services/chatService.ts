import { push, query, ref, limitToLast, onValue, set } from 'firebase/database';
import { db } from '../firebase';
import { ChatMessage, RawChatMessage } from '../types/chat';

function normalizeMessage(
  id: string,
  value: RawChatMessage
): ChatMessage | null {
  if (typeof value.text !== 'string' || value.text.trim() === '') {
    return null;
  }

  if (typeof value.createdAt !== 'number') {
    return null;
  }

  if (typeof value.userId !== 'string' || value.userId.trim() === '') {
    return null;
  }

  return {
    id,
    text: value.text,
    createdAt: value.createdAt,
    userId: value.userId,
  };
}

export function createCurrentUserId(): string {
  return 'arielgos';
}

export function subscribeToChatMessages(
  onMessages: (messages: ChatMessage[]) => void,
  onError: (message: string) => void
): () => void {
  const messagesRef = query(ref(db, 'messages'), limitToLast(200));

  return onValue(
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
    }
  );
}

export async function sendChatMessage(params: {
  text: string;
  userId: string;
}): Promise<void> {
  await push(ref(db, 'messages'), {
    text: params.text,
    createdAt: Date.now(),
    userId: params.userId,
  });
}

export async function clearAllMessages(): Promise<void> {
  const messagesRef = ref(db, 'messages');
  await set(messagesRef, null);
}
