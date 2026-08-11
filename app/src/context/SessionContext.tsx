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
} from "../services/sessionService";

// Define the session context type
interface SessionContextType {
  currentSessionId: string | null;
  currentSessionName: string | null;
  sessions: any[];
  refreshSessions: () => Promise<void>;
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
        if (sessions.length > 0) {
          const session = sessions.find((s) => s.id === sessionId);
          if (session) {
            setCurrentSessionName(session.name);
            return;
          }
        }
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

  // Initialize session data
  useEffect(() => {
    fetchCurrentSessionName();
    refreshSessions();
  }, [fetchCurrentSessionName, refreshSessions]);

  // For demonstration purposes, we'll simulate session changes
  // In a real app, you would set up Firebase listeners here

  const value = {
    currentSessionId,
    currentSessionName,
    sessions,
    refreshSessions,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};
