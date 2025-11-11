import type { DomainClock } from "../../domain/clock";
import { ChatMessage } from "../../domain/entities/ChatMessage";
import type { ChatMessageDTO } from "../dto/ChatMessageDTO";

export function toDomainMessage(dto: ChatMessageDTO, deps?: { clock?: DomainClock }): ChatMessage {
  return ChatMessage.restore(
    {
      id: dto.id,
      threadId: dto.threadId,
      senderType: dto.senderType,
      senderId: dto.senderId,
      body: dto.body,
      payload: dto.payload ?? null,
      createdAt: dto.createdAt,
      deliveredAt: dto.deliveredAt,
      readAt: dto.readAt,
    },
    deps,
  );
}

export function fromDomainMessage(message: ChatMessage): ChatMessageDTO {
  const snapshot = message.toSnapshot();
  return {
    id: snapshot.id,
    threadId: snapshot.threadId,
    senderType: snapshot.senderType,
    senderId: snapshot.senderId,
    body: snapshot.body,
    payload: snapshot.payload,
    createdAt: snapshot.createdAt,
    deliveredAt: snapshot.deliveredAt,
    readAt: snapshot.readAt,
    status: message.status,
  };
}
