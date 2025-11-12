import type { ThreadStatus } from "../../domain/enums";
import type { ChatMessageDTO } from "./ChatMessageDTO";
import type { ChatParticipantDTO } from "./ChatParticipantDTO";

export type PropertySummaryDTO = {
  id: string | null;
  title: string | null;
  price: number | null;
  currency: string | null;
  city: string | null;
  state: string | null;
  coverImageUrl: string | null;
  operationType: string | null;
  status: string | null;
};

export type ChatThreadDTO = {
  id: string;
  orgId: string | null;
  property: PropertySummaryDTO | null;
  contactId: string | null;
  createdBy: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  unreadCount: number;
  status: ThreadStatus;
  participants: ChatParticipantDTO[];
  lastMessage: ChatMessageDTO | null;
};
