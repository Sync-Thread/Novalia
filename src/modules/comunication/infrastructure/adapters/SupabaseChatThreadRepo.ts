import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { Result } from "../../application/_shared/result";
import type { Page } from "../../application/dto/PaginationDTO";
import { buildPage } from "../../application/dto/PaginationDTO";
import type { ChatThreadDTO } from "../../application/dto/ChatThreadDTO";
import type { ThreadFiltersDTO } from "../../application/dto/ThreadFiltersDTO";
import type { ChatThreadRepo } from "../../application/ports/ChatThreadRepo";
import type { SenderType } from "../../domain/enums";
import type {
  ChatMessageRow,
  ChatParticipantRow,
  ChatThreadRow,
  PropertySummaryRow,
} from "../types/supabase-rows";
import { scopeByContext } from "../utils/scopeByContext";

type ThreadRowWithRelations = ChatThreadRow & {
  properties?: PropertySummaryRow | null;
  participants?: ChatParticipantRow[] | null;
  last_message?: ChatMessageRow[] | null;
};

type ThreadInfraErrorCode = "THREAD_QUERY_FAILED" | "THREAD_NOT_FOUND" | "THREAD_UPDATE_FAILED";

type ThreadInfraError = {
  scope: "chat_threads";
  code: ThreadInfraErrorCode;
  message: string;
  cause?: unknown;
};

const THREAD_SELECT = `
  id,
  org_id,
  property_id,
  contact_id,
  created_by,
  created_at,
  last_message_at,
  properties:properties!chat_threads_property_id_fkey(
    id,
    title,
    price,
    currency,
    city,
    state,
    operation_type,
    status
  ),
  participants:chat_participants(
    user_id,
    contact_id,
    profiles:profiles(
      id,
      full_name,
      avatar_url,
      email,
      phone
    ),
    lead_contacts:lead_contacts(
      id,
      full_name,
      email,
      phone
    )
  ),
  last_message:chat_messages(order=created_at.desc,limit=1)(
    id,
    thread_id,
    sender_type,
    sender_user_id,
    sender_contact_id,
    body,
    payload,
    created_at,
    delivered_at,
    read_at
  )
`;

function infraError(code: ThreadInfraErrorCode, message: string, cause?: unknown): ThreadInfraError {
  return { scope: "chat_threads", code, message, cause };
}

function mapPostgrestError(code: ThreadInfraErrorCode, error: PostgrestError): ThreadInfraError {
  return infraError(code, error.message, error);
}

type ParticipantDTO = ChatThreadDTO["participants"][number];

export class SupabaseChatThreadRepo implements ChatThreadRepo {
  constructor(private readonly client: SupabaseClient) {}

  async listForLister(filters: ThreadFiltersDTO & { userId: string; orgId: string | null }): Promise<Result<Page<ChatThreadDTO>>> {
    return this.fetchThreads(filters, { readerType: "user", orgId: filters.orgId, userId: filters.userId });
  }

  async listForContact(filters: ThreadFiltersDTO & { contactId: string; orgId: string | null }): Promise<Result<Page<ChatThreadDTO>>> {
    return this.fetchThreads(
      { ...filters, contactId: filters.contactId },
      { readerType: "contact", orgId: filters.orgId, userId: filters.contactId },
    );
  }

  async getById(id: string): Promise<Result<ChatThreadDTO>> {
    let query = this.client
      .from("chat_threads")
      .select(THREAD_SELECT)
      .eq("id", id)
      .limit(1);

    const { data, error } = await query.single();
    if (error) {
      return Result.fail(mapPostgrestError("THREAD_NOT_FOUND", error));
    }

    const row = data as ThreadRowWithRelations;
    const unreadCounts = await this.computeUnreadCounts([row.id], "user");
    if (unreadCounts.isErr()) {
      return Result.fail(unreadCounts.error);
    }
    const dto = mapThreadRow(row, unreadCounts.value);
    return Result.ok(dto);
  }

  async touchLastMessageAt(id: string, timestamp: string): Promise<Result<void>> {
    const { error } = await this.client
      .from("chat_threads")
      .update({ last_message_at: timestamp })
      .eq("id", id);

    if (error) {
      return Result.fail(mapPostgrestError("THREAD_UPDATE_FAILED", error));
    }

    return Result.ok(undefined);
  }

  private async fetchThreads(
    filters: ThreadFiltersDTO & { page?: number; pageSize?: number; contactId?: string | null },
    scope: { readerType: SenderType; orgId: string | null; userId: string | null },
  ): Promise<Result<Page<ChatThreadDTO>>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(Math.max(1, filters.pageSize ?? 20), 50);
    const offset = (page - 1) * pageSize;

    let query = this.client
      .from("chat_threads")
      .select(THREAD_SELECT, { count: "exact" })
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    if (filters.propertyId) {
      query = query.eq("property_id", filters.propertyId);
    }
    if (filters.contactId) {
      query = query.eq("contact_id", filters.contactId);
    }
    query = scopeByContext(query, {
      orgId: scope.orgId ?? null,
      userId: scope.userId ?? scope.orgId ?? "",
    });

    const { data, error, count } = await query;
    if (error) {
      return Result.fail(mapPostgrestError("THREAD_QUERY_FAILED", error));
    }

    const rows = (data ?? []) as ThreadRowWithRelations[];
    const unreadCounts = await this.computeUnreadCounts(
      rows.map(row => row.id),
      scope.readerType,
    );
    if (unreadCounts.isErr()) {
      return Result.fail(unreadCounts.error);
    }

    const mapped = rows
      .map(row => mapThreadRow(row, unreadCounts.value))
      .filter(thread => applySearchFilter(thread, filters.search))
      .filter(thread => (filters.unreadOnly ? thread.unreadCount > 0 : true));

    return Result.ok(buildPage(mapped, count ?? mapped.length, page, pageSize));
  }

  private async computeUnreadCounts(
    threadIds: string[],
    readerType: SenderType,
  ): Promise<Result<Map<string, number>>> {
    if (threadIds.length === 0) {
      return Result.ok(new Map());
    }

    const senderType = readerType === "user" ? "contact" : "user";
    const { data, error } = await this.client
      .from("chat_messages")
      .select("thread_id")
      .in("thread_id", threadIds)
      .eq("sender_type", senderType)
      .is("read_at", null);

    if (error) {
      return Result.fail(mapPostgrestError("THREAD_QUERY_FAILED", error));
    }

    const counts = new Map<string, number>();
    (data as { thread_id: string }[] | null)?.forEach(row => {
      counts.set(row.thread_id, (counts.get(row.thread_id) ?? 0) + 1);
    });
    return Result.ok(counts);
  }
}

function mapThreadRow(row: ThreadRowWithRelations, unreadCounts: Map<string, number>): ChatThreadDTO {
  const lastMessageRow = Array.isArray(row.last_message) ? row.last_message[0] ?? null : null;
  return {
    id: row.id,
    orgId: row.org_id,
    property: mapProperty(row.properties ?? null),
    contactId: row.contact_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    lastMessageAt: row.last_message_at,
    unreadCount: unreadCounts.get(row.id) ?? 0,
    status: "open",
    participants: mapParticipants(row.participants ?? []),
    lastMessage: lastMessageRow ? mapMessageRow(lastMessageRow) : null,
  };
}

function mapProperty(row: PropertySummaryRow | null): ChatThreadDTO["property"] {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title ?? null,
    price: row.price,
    currency: row.currency ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    coverImageUrl: null,
    operationType: row.operation_type ?? null,
    status: row.status ?? null,
  };
}

function mapParticipants(rows: ChatParticipantRow[]): ParticipantDTO[] {
  return rows
    .map(row => {
      if (row.user_id) {
        return {
          id: row.user_id,
          type: "user" as const,
          displayName: row.profiles?.full_name ?? null,
          avatarUrl: row.profiles?.avatar_url ?? null,
          email: row.profiles?.email ?? null,
          phone: row.profiles?.phone ?? null,
          lastSeenAt: null,
        };
      }
      if (row.contact_id) {
        return {
          id: row.contact_id,
          type: "contact" as const,
          displayName: row.lead_contacts?.full_name ?? null,
          avatarUrl: null,
          email: row.lead_contacts?.email ?? null,
          phone: row.lead_contacts?.phone ?? null,
          lastSeenAt: null,
        };
      }
      return null;
    })
    .filter((participant): participant is ParticipantDTO => Boolean(participant));
}

function mapMessageRow(row: ChatMessageRow) {
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
    status: row.read_at ? "read" : row.delivered_at ? "delivered" : "sent",
  };
}

function applySearchFilter(thread: ChatThreadDTO, search?: string | null): boolean {
  if (!search) return true;
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  const propertyMatches = thread.property?.title?.toLowerCase().includes(normalized) ?? false;
  const participantMatches = thread.participants.some(participant =>
    (participant.displayName ?? "").toLowerCase().includes(normalized),
  );
  return propertyMatches || participantMatches;
}
