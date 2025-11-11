import type { Result } from "../_shared/result";
import type { Page } from "../dto/PaginationDTO";
import type { ChatMessageDTO } from "../dto/ChatMessageDTO";
import type { SenderType } from "../../domain/enums";

export interface ChatMessageRepo {
  listByThread(input: { threadId: string; page: number; pageSize: number }): Promise<Result<Page<ChatMessageDTO>>>;
  create(input: {
    threadId: string;
    senderType: SenderType;
    senderId: string | null;
    body: string | null;
    payload: Record<string, unknown> | null;
  }): Promise<Result<ChatMessageDTO>>;
  markThreadAsRead(input: { threadId: string; readerType: SenderType; readerId: string | null }): Promise<Result<void>>;
}
