import type { ChatMessageDTO } from "./ChatMessageDTO";

export type SendMessageInput = {
  threadId: string;
  body: string;
  payload?: Record<string, unknown> | null;
};

export type SendMessageResult = ChatMessageDTO;
