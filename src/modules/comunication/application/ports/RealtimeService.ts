import type { Result } from "../_shared/result";
import type { ChatMessageDTO } from "../dto/ChatMessageDTO";

export type ThreadRealtimeHandlers = {
  onMessage?: (message: ChatMessageDTO) => void;
  onTyping?: (participantId: string) => void;
  onDelivered?: (messageId: string) => void;
};

export interface RealtimeService {
  subscribeToThread(threadId: string, handlers: ThreadRealtimeHandlers): Promise<Result<void>>;
  unsubscribe(threadId: string): Promise<void>;
  broadcastTyping(threadId: string, participantId: string): Promise<Result<void>>;
}
