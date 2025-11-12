import type { Result } from "../_shared/result";
import type { Page } from "../dto/PaginationDTO";
import type { ThreadFiltersDTO } from "../dto/ThreadFiltersDTO";
import type { ChatThreadDTO } from "../dto/ChatThreadDTO";

export interface ChatThreadRepo {
  listForLister(filters: ThreadFiltersDTO & { userId: string; orgId: string | null }): Promise<Result<Page<ChatThreadDTO>>>;
  listForContact(filters: ThreadFiltersDTO & { contactId: string; orgId: string | null }): Promise<Result<Page<ChatThreadDTO>>>;
  getById(id: string): Promise<Result<ChatThreadDTO>>;
  touchLastMessageAt(id: string, timestamp: string): Promise<Result<void>>;
  findByPropertyAndUser(input: { propertyId: string; userId: string }): Promise<Result<ChatThreadDTO | null>>;
  create(input: {
    orgId: string | null;
    propertyId: string;
    createdBy: string;
    participantUserIds: string[];
  }): Promise<Result<ChatThreadDTO>>;
}
