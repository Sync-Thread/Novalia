import type { ChatThreadDTO, PropertySummaryDTO } from "./ChatThreadDTO";

export type ListerThreadGroupDTO = {
  property: PropertySummaryDTO | null;
  threadCount: number;
  unreadCount: number;
  threads: ChatThreadDTO[];
};

export type ListerInboxDTO = {
  groups: ListerThreadGroupDTO[];
  totalUnread: number;
  totalThreads: number;
};

export type ClientInboxDTO = {
  property: PropertySummaryDTO | null;
  thread: ChatThreadDTO | null;
  unreadCount: number;
};
