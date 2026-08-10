import { push, query, ref, limitToLast, onValue, set, get } from 'firebase/database';
import { db } from '../firebase';
import { ChatMessage, RawChatMessage } from '../types/chat';
import { saveMessageToSession } from './sessionService';

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
    sessionId: value.sessionId as string | undefined,
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
  sessionId?: string;
}): Promise<void> {
  // For backward compatibility, we still save to the global messages collection
  // but in a real implementation, we'd use the session structure
  
  await push(ref(db, 'messages'), {
    text: params.text,
    createdAt: Date.now(),
    userId: params.userId,
    sessionId: params.sessionId,
  });
  
  // Also save to session-specific storage if session ID is provided
  if (params.sessionId) {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: params.text,
      createdAt: Date.now(),
      userId: params.userId,
      sessionId: params.sessionId
    };
    
    await saveMessageToSession(params.sessionId, newMessage);
  }
}

export async function clearAllMessages(): Promise<void> {
  const messagesRef = ref(db, 'messages');
  await set(messagesRef, null);
}

export async function clearMessagesBySession(sessionId: string): Promise<void> {
  // In a real implementation, this would query and delete only messages from the specific session
  console.log(`Clearing messages for session: ${sessionId}`);
  // In a real app, you would use Firebase queries to delete only messages with the specific sessionId
}
