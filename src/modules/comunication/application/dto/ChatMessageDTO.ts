import type { MessageStatus, SenderType } from "../../domain/enums";

export type ChatMessageDTO = {
  id: string;
  threadId: string;
  senderType: SenderType;
  senderId: string | null;
  body: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  status: MessageStatus;
};
