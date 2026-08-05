import React, { useState, useEffect } from 'react';

interface Message {
  id: string;
  text: string;
  userId: string;
  createdAt: number;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simulate loading messages
    const mockMessages: Message[] = [
      {
        id: '1',
        text: 'Hello, this is a test message!',
        userId: 'arielgos',
        createdAt: Date.now() - 3600000,
      },
      {
        id: '2',
        text: 'Welcome to the chat app!',
        userId: 'arielgos',
        createdAt: Date.now() - 1800000,
      },
    ];
    
    setMessages(mockMessages);
    setIsLoading(false);
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      userId: 'arielgos',
      createdAt: Date.now(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="app">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Pocket Helper Chat</h1>
      </header>
      
      <div className="chat-container">
        <div className="messages-list">
          {messages.map((message) => (
            <div key={message.id} className="message">
              <div className="message-header">
                <span className="user-id">{message.userId}</span>
                <span className="timestamp">{formatTime(message.createdAt)}</span>
              </div>
              <p className="message-text">{message.text}</p>
            </div>
          ))}
        </div>
        
        <div className="message-input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="message-input"
          />
          <button onClick={handleSendMessage} className="send-button">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;