export type ChatMessage = {
  id: string;
  text: string;
  createdAt: number;
  userId: string;
  sessionId?: string;
};

export type RawChatMessage = {
  text?: unknown;
  createdAt?: unknown;
  userId?: unknown;
  sessionId?: unknown;
};
