import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Result } from "../../application/_shared/result";
import type { Page } from "../../application/dto/PaginationDTO";
import { buildPage } from "../../application/dto/PaginationDTO";
import type { ChatMessageDTO } from "../../application/dto/ChatMessageDTO";
import type { ChatMessageRepo } from "../../application/ports/ChatMessageRepo";
import type { SenderType } from "../../domain/enums";
import type { ChatMessageRow } from "../types/supabase-rows";

type MessageInfraErrorCode = "MESSAGE_QUERY_FAILED" | "MESSAGE_CREATE_FAILED";

type MessageInfraError = {
  scope: "chat_messages";
  code: MessageInfraErrorCode;
  message: string;
  cause?: unknown;
};

function infraError(code: MessageInfraErrorCode, message: string, cause?: unknown): MessageInfraError {
  return { scope: "chat_messages", code, message, cause };
}

function mapPostgrestError(code: MessageInfraErrorCode, error: PostgrestError): MessageInfraError {
  return infraError(code, error.message, error);
}

export class SupabaseChatMessageRepo implements ChatMessageRepo {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async listByThread(input: { threadId: string; page: number; pageSize: number }): Promise<Result<Page<ChatMessageDTO>>> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(Math.max(1, input.pageSize), 100);
    const offset = (page - 1) * pageSize;

    const { data, error, count } = await this.client
      .from("chat_messages")
      .select(
        "id, thread_id, sender_type, sender_user_id, sender_contact_id, body, payload, created_at, delivered_at, read_at",
        { count: "exact" },
      )
      .eq("thread_id", input.threadId)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('❌ Error cargando mensajes:', error);
      return Result.fail(mapPostgrestError("MESSAGE_QUERY_FAILED", error));
    }

    const rows = (data ?? []) as ChatMessageRow[];
    const mapped = rows.map(mapMessageRow);
    
    return Result.ok(buildPage(mapped, count ?? mapped.length, page, pageSize));
  }

  async create(input: {
    threadId: string;
    senderType: SenderType;
    senderId: string | null;
    body: string | null;
    payload: Record<string, unknown> | null;
  }): Promise<Result<ChatMessageDTO>> {
    const payload = {
      thread_id: input.threadId,
      sender_type: input.senderType,
      sender_user_id: input.senderType === "user" ? input.senderId : null,
      sender_contact_id: input.senderType === "contact" ? input.senderId : null,
      body: input.body,
      payload: input.payload,
    };

    const { data, error } = await this.client.from("chat_messages").insert(payload).select("*").single();

    if (error) {
      return Result.fail(mapPostgrestError("MESSAGE_CREATE_FAILED", error));
    }

    return Result.ok(mapMessageRow(data as ChatMessageRow));
  }

  async markThreadAsRead(input: { threadId: string; readerType: SenderType; readerId: string | null }): Promise<Result<void>> {
    const counterpart = input.readerType === "user" ? "contact" : "user";
    const timestamp = new Date().toISOString();

    const { error } = await this.client
      .from("chat_messages")
      .update({ read_at: timestamp, delivered_at: timestamp })
      .eq("thread_id", input.threadId)
      .eq("sender_type", counterpart)
      .is("read_at", null);

    if (error) {
      return Result.fail(mapPostgrestError("MESSAGE_QUERY_FAILED", error));
    }

    return Result.ok(undefined);
  }
}

function mapMessageRow(row: ChatMessageRow): ChatMessageDTO {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderType: row.sender_type,
    senderId: row.sender_user_id ?? row.sender_contact_id,
    body: row.body,
    payload: row.payload ?? null,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    status: (row.read_at ? "read" : row.delivered_at ? "delivered" : "sent") as "read" | "delivered" | "sent",
  };
}
