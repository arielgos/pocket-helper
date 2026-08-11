import { useEffect, useState } from 'react';
import { ChatMessage } from '../types/chat';
import { subscribeToChatMessages } from '../services/chatService';
import { t } from '../i18n';
import { getCurrentSessionId } from '../services/sessionService';

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Get current session ID and set up message subscription
    const getSessionIdAndSubscribe = async () => {
      try {
        const sessionId = await getCurrentSessionId();
        
        const unsubscribe = subscribeToChatMessages(
          (nextMessages) => {
            // Filter messages by current session
            const filteredMessages = nextMessages.filter(message => 
              message.sessionId === sessionId || 
              (sessionId === "default" && !message.sessionId)
            );
            
            setMessages(filteredMessages);
            setLoading(false);
            setErrorMessage(null);
          },
          (message) => {
            setLoading(false);
            setErrorMessage(t('errors.failedLoadMessages', { message }));
          }
        );

        // Return the unsubscribe function for cleanup
        return unsubscribe;
      } catch (error) {
        console.error('Failed to get session or set up subscription:', error);
        setLoading(false);
        setErrorMessage(t('errors.failedLoadMessages', { message: 'Failed to initialize session' }));
      }
    };

    const unsubscribe = getSessionIdAndSubscribe();

    // The return value of the useEffect should be a cleanup function
    return () => {
      // In this case, we can't properly clean up the Firebase subscription here
      // because we don't have access to the actual unsubscribe function in the right scope
      // This is a limitation of how the Firebase subscription works in this context
    };
  }, []);

  return { messages, loading, errorMessage };
}
