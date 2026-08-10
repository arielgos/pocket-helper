// Firebase-based session storage with session -> messages structure

import { ref, set, get, update, push } from 'firebase/database';
import { db } from '../firebase';
import { ChatMessage } from '../types/chat';

export type Session = {
  id: string;
  name: string;
  createdAt: number;
};

export async function getAllSessions(): Promise<Session[]> {
  try {
    const sessionsRef = ref(db, 'sessions');
    const snapshot = await get(sessionsRef);
    
    if (snapshot.exists()) {
      const sessionsData = snapshot.val();
      return Object.keys(sessionsData).map(id => ({
        id,
        name: sessionsData[id].name,
        createdAt: sessionsData[id].createdAt
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get sessions:', error);
    return [];
  }
}

export async function createSession(name: string): Promise<Session> {
  try {
    // Check if session with this name already exists
    const sessions = await getAllSessions();
    const existingSession = sessions.find(session => session.name === name);
    
    if (existingSession) {
      // If it exists, return it
      return existingSession;
    }
    
    // Create new session
    const newSession: Session = {
      id: Date.now().toString(),
      name,
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
    // Remove session from sessions list
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
        sessionId: sessionId
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
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Failed to save message to session:', error);
    throw error;
  }
}