import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getCurrentSessionId,
  getAllSessions,
  setCurrentSession,
} from "../services/sessionService";

// Define the session context type
interface SessionContextType {
  currentSessionId: string | null;
  currentSessionName: string | null;
  sessions: any[];
  refreshSessions: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(
    null,
  );
  const [sessions, setSessions] = useState<any[]>([]);

  // Fetch current session name
  const fetchCurrentSessionName = useCallback(async () => {
    try {
      const sessionId = await getCurrentSessionId();
      setCurrentSessionId(sessionId);

      // For demonstration, we'll set a default name
      if (sessionId === "default") {
        setCurrentSessionName("Default Session");
      } else {
        // In a real implementation, you'd fetch the session name from Firebase
        setCurrentSessionName(`Session-${sessionId}`);
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

  // Switch session
  const switchSession = useCallback(async (sessionId: string) => {
    try {
      await setCurrentSession(sessionId);
      setCurrentSessionId(sessionId);

      // Update session name
      if (sessionId === "default") {
        setCurrentSessionName("Default Session");
      } else {
        setCurrentSessionName(`Session-${sessionId}`);
      }
    } catch (error) {
      console.error("Failed to switch session:", error);
    }
  }, []);

  // Initialize session data
  useEffect(() => {
    fetchCurrentSessionName();
    refreshSessions();
  }, [fetchCurrentSessionName, refreshSessions]);

  const value = {
    currentSessionId,
    currentSessionName,
    sessions,
    refreshSessions,
    switchSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};
