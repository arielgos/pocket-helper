export enum MessageType {
  Message = "message",
  Post = "post",
  Echo = "echo",
}

export type ChatMessage = {
  id: string;
  text: string;
  createdAt: number;
  userId: string;
  sessionId?: string;
  type: MessageType;
};

export type RawChatMessage = {
  text?: unknown;
  createdAt?: unknown;
  userId?: unknown;
  sessionId?: unknown;
  type?: unknown;
};
