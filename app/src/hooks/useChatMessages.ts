import { useEffect, useState, useRef } from 'react';
import { ChatMessage } from '../types/chat';
import { subscribeToSessionMessages } from '../services/chatService';
import { t } from '../i18n';
import { useSession } from '../context/SessionContext';

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { currentSessionId, onSessionChange } = useSession();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Clear previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Reset state when session changes
    setLoading(true);
    setMessages([]);
    setErrorMessage(null);

    // Subscribe to current session messages
    try {
      const unsubscribe = subscribeToSessionMessages(
        currentSessionId,
        (nextMessages) => {
          setMessages(nextMessages);
          setLoading(false);
          setErrorMessage(null);
        },
        (message) => {
          setLoading(false);
          setErrorMessage(t('errors.failedLoadMessages', { message }));
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('Failed to set up message subscription:', error);
      setLoading(false);
      setErrorMessage(t('errors.failedLoadMessages', { message: 'Failed to initialize subscription' }));
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentSessionId, onSessionChange, t]);

  return { messages, loading, errorMessage };
}
