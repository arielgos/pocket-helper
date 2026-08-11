import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  getCurrentSessionId,
  getAllSessions,
  setCurrentSession,
  getSessionById,
} from "../services/sessionService";
import type { Session } from "../services/sessionService";

// Define the session context type
interface SessionContextType {
  currentSessionId: string;
  currentSessionName: string;
  sessions: Session[];
  refreshSessions: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  onSessionChange: (callback: (sessionId: string) => void) => () => void;
}

// Create the session context with default values
const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentSessionId, setCurrentSessionId] = useState<string>("default");
  const [currentSessionName, setCurrentSessionName] = useState<string>(
    "Default Session",
  );
  const [sessions, setSessions] = useState<Session[]>([]);
  const sessionChangeListeners = useRef<Set<(sessionId: string) => void>>(new Set());

  // Fetch current session data
  const fetchCurrentSession = useCallback(async () => {
    try {
      const sessionId = await getCurrentSessionId();
      setCurrentSessionId(sessionId);

      // Fetch session details
      if (sessionId === "default") {
        setCurrentSessionName("Default Session");
      } else {
        const session = await getSessionById(sessionId);
        setCurrentSessionName(session?.name || `Session-${sessionId}`);
      }
    } catch (error) {
      console.error("Failed to fetch current session:", error);
      setCurrentSessionId("default");
      setCurrentSessionName("Default Session");
    }
  }, []);

  // Refresh sessions list
  const refreshSessions = useCallback(async () => {
    try {
      const sessionList = await getAllSessions();
      setSessions(sessionList);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      setSessions([]);
    }
  }, []);

  // Switch session with listener notification
  const switchSession = useCallback(async (sessionId: string) => {
    try {
      await setCurrentSession(sessionId);
      setCurrentSessionId(sessionId);

      // Update session name
      if (sessionId === "default") {
        setCurrentSessionName("Default Session");
      } else {
        const session = await getSessionById(sessionId);
        setCurrentSessionName(session?.name || `Session-${sessionId}`);
      }

      // Notify all listeners of session change
      sessionChangeListeners.current.forEach((listener) => {
        listener(sessionId);
      });

      // Refresh sessions list after switch
      await refreshSessions();
    } catch (error) {
      console.error("Failed to switch session:", error);
    }
  }, [refreshSessions]);

  // Register session change listener
  const onSessionChange = useCallback(
    (callback: (sessionId: string) => void) => {
      sessionChangeListeners.current.add(callback);
      
      // Return unsubscribe function
      return () => {
        sessionChangeListeners.current.delete(callback);
      };
    },
    []
  );

  // Initialize session data
  useEffect(() => {
    fetchCurrentSession();
    refreshSessions();
  }, [fetchCurrentSession, refreshSessions]);

  const value = {
    currentSessionId,
    currentSessionName,
    sessions,
    refreshSessions,
    switchSession,
    onSessionChange,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};
