import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { Result } from "../../application/_shared/result";
import type { RealtimeService, ThreadRealtimeHandlers } from "../../application/ports/RealtimeService";
import type { ChatMessageDTO } from "../../application/dto/ChatMessageDTO";

export class SupabaseRealtimeChatService implements RealtimeService {
  private readonly channels = new Map<string, RealtimeChannel>();

  constructor(private readonly client: SupabaseClient) {}

  async subscribeToThread(threadId: string, handlers: ThreadRealtimeHandlers): Promise<Result<void>> {
    if (this.channels.has(threadId)) {
      await this.unsubscribe(threadId);
    }

    const channel = this.client
      .channel(`chat:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        payload => {
          handlers.onMessage?.(mapRowToDto(payload.new));
        },
      )
      .on("broadcast", { event: "typing" }, payload => {
        const participantId = payload?.payload?.participantId as string | undefined;
        if (participantId) {
          handlers.onTyping?.(participantId);
        }
      })
      .subscribe();

    this.channels.set(threadId, channel);
    return Result.ok(undefined);
  }

  async unsubscribe(threadId: string): Promise<void> {
    const existing = this.channels.get(threadId);
    if (existing) {
      await this.client.removeChannel(existing);
      this.channels.delete(threadId);
    }
  }

  async broadcastTyping(threadId: string, participantId: string): Promise<Result<void>> {
    const channel = this.channels.get(threadId);
    if (!channel) {
      return Result.fail({ scope: "realtime", code: "CHANNEL_NOT_FOUND", message: "No hay canal suscrito" });
    }
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { participantId, at: Date.now() },
    });
    return Result.ok(undefined);
  }
}

function mapRowToDto(row: Record<string, unknown> | null): ChatMessageDTO {
  const payload = row ?? {};
  return {
    id: String(payload.id ?? ""),
    threadId: String(payload.thread_id ?? ""),
    senderType: (payload.sender_type as ChatMessageDTO["senderType"]) ?? "user",
    senderId:
      (payload.sender_user_id as string | null | undefined) ??
      (payload.sender_contact_id as string | null | undefined) ??
      null,
    body: (payload.body as string | null | undefined) ?? null,
    payload: (payload.payload as Record<string, unknown> | null | undefined) ?? null,
    createdAt: (payload.created_at as string | null | undefined) ?? new Date().toISOString(),
    deliveredAt: (payload.delivered_at as string | null | undefined) ?? null,
    readAt: (payload.read_at as string | null | undefined) ?? null,
    status: payload.read_at ? "read" : payload.delivered_at ? "delivered" : "sent",
  };
}
