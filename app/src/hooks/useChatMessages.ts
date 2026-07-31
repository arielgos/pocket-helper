import { useEffect, useState } from 'react';
import { ChatMessage } from '../types/chat';
import { subscribeToChatMessages } from '../services/chatService';
import { t } from '../i18n';

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(
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

    return unsubscribe;
  }, []);

  return { messages, loading, errorMessage };
}
