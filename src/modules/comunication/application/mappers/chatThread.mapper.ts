import type { DomainClock } from "../../domain/clock";
import { ChatThread } from "../../domain/entities/ChatThread";
import { Participant } from "../../domain/entities/Participant";
import { UniqueEntityID } from "../../domain/value-objects";
import type { ChatThreadDTO } from "../dto/ChatThreadDTO";
import type { ChatParticipantDTO } from "../dto/ChatParticipantDTO";
import type { ChatMessageDTO } from "../dto/ChatMessageDTO";

function toParticipantSnapshot(dto: ChatParticipantDTO) {
  return {
    id: dto.id,
    type: dto.type,
    displayName: dto.displayName,
    avatarUrl: null,
    email: dto.email,
    phone: dto.phone,
    lastSeenAt: dto.lastSeenAt,
  };
}

function fromParticipantSnapshot(participant: Participant): ChatParticipantDTO {
  const snapshot = participant.toSnapshot();
  return {
    id: snapshot.id,
    type: snapshot.type,
    displayName: snapshot.displayName,
    email: snapshot.email,
    phone: snapshot.phone,
    lastSeenAt: snapshot.lastSeenAt,
  };
}

export function toDomainThread(dto: ChatThreadDTO, deps?: { clock?: DomainClock }): ChatThread {
  return ChatThread.restore(
    {
      id: dto.id,
      orgId: dto.orgId,
      property: dto.property ? { ...dto.property } : null,
      contactId: dto.contactId,
      createdBy: dto.createdBy,
      participants: dto.participants.map(toParticipantSnapshot),
      createdAt: dto.createdAt,
      lastMessageAt: dto.lastMessageAt,
      unreadCount: dto.unreadCount,
      status: dto.status,
    },
    deps,
  );
}

export function fromDomainThread(thread: ChatThread, extras?: { lastMessage?: ChatMessageDTO | null }): ChatThreadDTO {
  const snapshot = thread.toSnapshot();
  return {
    id: snapshot.id,
    orgId: snapshot.orgId,
    property: snapshot.property ? { ...snapshot.property } : null,
    contactId: snapshot.contactId,
    createdBy: snapshot.createdBy,
    createdAt: snapshot.createdAt,
    lastMessageAt: snapshot.lastMessageAt,
    unreadCount: snapshot.unreadCount,
    status: snapshot.status,
    participants: thread.participants.map(fromParticipantSnapshot),
    lastMessage: extras?.lastMessage ?? null,
  };
}
