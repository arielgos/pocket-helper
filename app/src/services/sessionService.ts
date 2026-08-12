// Firebase-based session storage with session -> messages structure

import { ref, set, get, update, push, remove } from 'firebase/database';
import { db } from '../firebase';
import { ChatMessage } from '../types/chat';

export type Session = {
  id: string;
  name: string;
  createdAt: number;
  lastMessageAt?: number;
  messageCount?: number;
};

export async function getAllSessions(): Promise<Session[]> {
  try {
    const sessionsRef = ref(db, 'sessions');
    const snapshot = await get(sessionsRef);
    
    if (snapshot.exists()) {
      const sessionsData = snapshot.val();
      const sessions = Object.keys(sessionsData).map(id => ({
        id,
        name: sessionsData[id].name,
        createdAt: sessionsData[id].createdAt,
        lastMessageAt: sessionsData[id].lastMessageAt,
        messageCount: sessionsData[id].messageCount || 0
      }));
      
      // Sort by last message time (most recent first)
      return sessions.sort((a, b) => 
        (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt)
      );
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get sessions:', error);
    return [];
  }
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  try {
    const sessionRef = ref(db, `sessions/${sessionId}`);
    const snapshot = await get(sessionRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        id: sessionId,
        name: data.name,
        createdAt: data.createdAt,
        lastMessageAt: data.lastMessageAt,
        messageCount: data.messageCount || 0
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get session by ID:', error);
    return null;
  }
}

export async function createSession(name: string): Promise<Session> {
  try {
    // Sanitize session name to contain only letters, numbers, or hyphens
    const sanitizedSessionName = name.replace(/[^a-zA-Z0-9-]/g, '-');
    
    // Check if session with this name already exists
    const sessions = await getAllSessions();
    const existingSession = sessions.find(session => session.name === sanitizedSessionName);
    
    if (existingSession) {
      // If it exists, return it
      return existingSession;
    }
    
    // Create new session
    const newSession: Session = {
      id: Date.now().toString(),
      name: sanitizedSessionName,
      createdAt: Date.now(),
    };

    // Save session to Firebase
    const sessionsRef = ref(db, 'sessions');
    await update(sessionsRef, {
      [newSession.id]: {
        name: newSession.name,
        createdAt: newSession.createdAt
      }
    });

    return newSession;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
}

export async function setCurrentSession(sessionId: string): Promise<void> {
  try {
    const currentSessionRef = ref(db, 'current_session');
    await set(currentSessionRef, sessionId || "default");
  } catch (error) {
    console.error('Failed to set current session:', error);
    throw error;
  }
}

export async function getCurrentSessionId(): Promise<string> {
  try {
    const currentSessionRef = ref(db, 'current_session');
    const snapshot = await get(currentSessionRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    // Return "default" as the default session instead of null
    return "default";
  } catch (error) {
    console.error('Failed to get current session:', error);
    // Return "default" as the default session instead of null
    return "default";
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    // Prevent deletion of default session
    if (sessionId === "default") {
      throw new Error("Cannot delete the default session");
    }
    
    // Remove all messages associated with this session
    const messagesRef = ref(db, `sessions/${sessionId}/messages`);
    await remove(messagesRef);
    
    // Remove session metadata from sessions list
    const sessionsRef = ref(db, 'sessions');
    const updateData: any = {};
    updateData[`/${sessionId}`] = null;
    await update(sessionsRef, updateData);
    
    // If we're deleting the current session, reset to default
    const currentSessionId = await getCurrentSessionId();
    if (currentSessionId === sessionId) {
      const currentSessionRef = ref(db, 'current_session');
      await set(currentSessionRef, "default");
    }
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    const messagesRef = ref(db, `sessions/${sessionId}/messages`);
    const snapshot = await get(messagesRef);
    
    if (snapshot.exists()) {
      const messagesData = snapshot.val();
      return Object.keys(messagesData).map(id => ({
        id,
        text: messagesData[id].text,
        createdAt: messagesData[id].createdAt,
        userId: messagesData[id].userId,
        sessionId: sessionId,
        type: messagesData[id].type || 'message'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get session messages:', error);
    return [];
  }
}

export async function saveMessageToSession(sessionId: string, message: ChatMessage): Promise<void> {
  try {
    const messagesRef = ref(db, `sessions/${sessionId}/messages`);
    await push(messagesRef, {
      text: message.text,
      createdAt: message.createdAt,
      userId: message.userId,
      sessionId: sessionId,
      type: message.type
    });
    
    // Update session metadata
    await updateSessionMetadata(sessionId);
  } catch (error) {
    console.error('Failed to save message to session:', error);
    throw error;
  }
}

export async function updateSessionMetadata(sessionId: string): Promise<void> {
  try {
    const messages = await getSessionMessages(sessionId);
    const sessionRef = ref(db, `sessions/${sessionId}`);
    
    await update(sessionRef, {
      lastMessageAt: Date.now(),
      messageCount: messages.length
    });
  } catch (error) {
    console.error('Failed to update session metadata:', error);
  }
}

export async function clearSessionMessages(sessionId: string): Promise<void> {
  try {
    const messagesRef = ref(db, `sessions/${sessionId}/messages`);
    await remove(messagesRef);
    
    // Update session metadata
    const sessionRef = ref(db, `sessions/${sessionId}`);
    await update(sessionRef, {
      messageCount: 0
    });
  } catch (error) {
    console.error('Failed to clear session messages:', error);
    throw error;
  }
}