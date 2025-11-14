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
  ChatThreadRow,
  PropertySummaryRow,
} from "../types/supabase-rows";
import { scopeByContext } from "../utils/scopeByContext";

type ThreadRowWithRelations = ChatThreadRow & {
  properties?: PropertySummaryRow | null;
  participants?: Array<{
    user_id: string | null;
    contact_id: string | null;
    profiles?: Array<{ id: string; full_name: string | null; email: string | null; phone: string | null }> | null;
    lead_contacts?: Array<{ id: string; full_name: string | null; email: string | null; phone: string | null }> | null;
  }> | null;
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
    status,
    media_assets!media_assets_property_id_fkey(
      id,
      s3_key,
      metadata
    )
  ),
  participants:chat_participants(
    user_id,
    contact_id,
    user_profiles:profiles(
      id,
      full_name,
      email,
      phone
    ),
    contacts:lead_contacts(
      id,
      full_name,
      email,
      phone
    )
  ),
  last_message:chat_messages(
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
type ParticipantThreadRow = { thread_id: string };

export class SupabaseChatThreadRepo implements ChatThreadRepo {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

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

    const row = data as unknown as ThreadRowWithRelations;

    const unreadCounts = await this.computeUnreadCounts([row.id], "user", null);
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

  async findByPropertyAndUser(input: { propertyId: string; userId: string }): Promise<Result<ChatThreadDTO | null>> {
    // Find ALL threads for this property (don't limit)
    const { data, error } = await this.client
      .from("chat_threads")
      .select(THREAD_SELECT)
      .eq("property_id", input.propertyId);

    if (error) {
      return Result.fail(mapPostgrestError("THREAD_QUERY_FAILED", error));
    }

    if (!data || data.length === 0) {
      return Result.ok(null);
    }

    const rows = data as unknown as ThreadRowWithRelations[];
    
    // Find thread where user is participant
    const matchingThread = rows.find(row => {
      const hasUser = row.participants?.some(p => p.user_id === input.userId);
      return hasUser;
    });

    if (!matchingThread) {
      return Result.ok(null);
    }

    const unreadCounts = await this.computeUnreadCounts([matchingThread.id], "user", input.userId);
    if (unreadCounts.isErr()) {
      return Result.fail(unreadCounts.error);
    }

    const dto = mapThreadRow(matchingThread, unreadCounts.value);
    return Result.ok(dto);
  }

  async create(input: {
    orgId: string | null;
    propertyId: string;
    createdBy: string;
    participantUserIds: string[];
  }): Promise<Result<ChatThreadDTO>> {
    // Insert thread
    const { data: threadData, error: threadError } = await this.client
      .from("chat_threads")
      .insert({
        org_id: input.orgId,
        property_id: input.propertyId,
        created_by: input.createdBy,
        created_at: new Date().toISOString(),
        last_message_at: null,
      })
      .select()
      .single();

    if (threadError) {
      return Result.fail(mapPostgrestError("THREAD_QUERY_FAILED", threadError));
    }

    const threadRow = threadData as ChatThreadRow;

    // Insert participants
    const participantsToInsert = input.participantUserIds.map(userId => ({
      thread_id: threadRow.id,
      user_id: userId,
      contact_id: null,
    }));

    const { error: participantsError } = await this.client
      .from("chat_participants")
      .insert(participantsToInsert);

    if (participantsError) {
      // Rollback: delete the thread if participants failed
      await this.client.from("chat_threads").delete().eq("id", threadRow.id);
      return Result.fail(mapPostgrestError("THREAD_QUERY_FAILED", participantsError));
    }

    // Fetch the complete thread with all relations
    return this.getById(threadRow.id);
  }

  private async fetchThreads(
    filters: ThreadFiltersDTO & { page?: number; pageSize?: number; contactId?: string | null },
    scope: { readerType: SenderType; orgId: string | null; userId: string | null },
  ): Promise<Result<Page<ChatThreadDTO>>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(Math.max(1, filters.pageSize ?? 20), 50);
    const offset = (page - 1) * pageSize;

    let allowedThreadIds: string[] | null = null;
    if (scope.userId) {
      const participantColumn = scope.readerType === "user" ? "user_id" : "contact_id";
      const { data: participantRows, error: participantError } = await this.client
        .from("chat_participants")
        .select("thread_id")
        .eq(participantColumn, scope.userId);

      if (participantError) {
        return Result.fail(mapPostgrestError("THREAD_QUERY_FAILED", participantError));
      }

      allowedThreadIds = Array.from(
        new Set(((participantRows ?? []) as ParticipantThreadRow[]).map(row => row.thread_id)),
      );

      if (allowedThreadIds.length === 0) {
        return Result.ok(buildPage([], 0, page, pageSize));
      }
    }

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

    if (allowedThreadIds) {
      query = query.in("id", allowedThreadIds);
    }

    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ Query error:', error);
      return Result.fail(mapPostgrestError("THREAD_QUERY_FAILED", error));
    }

    const rows = (data ?? []) as unknown as ThreadRowWithRelations[];
    
    const unreadCounts = await this.computeUnreadCounts(
      rows.map(row => row.id),
      scope.readerType,
      scope.userId,
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
    readerId: string | null,
  ): Promise<Result<Map<string, number>>> {
    if (threadIds.length === 0) {
      return Result.ok(new Map());
    }

    // Count messages that:
    // 1. Are in the specified threads
    // 2. Have read_at = null (unread)
    // 3. Were NOT sent by the current user (if readerId is provided)
    let query = this.client
      .from("chat_messages")
      .select("thread_id, sender_user_id, sender_contact_id")
      .in("thread_id", threadIds)
      .is("read_at", null);
    
    // Filter out messages sent by the reader
    if (readerId) {
      if (readerType === "user") {
        query = query.neq("sender_user_id", readerId);
      } else {
        query = query.neq("sender_contact_id", readerId);
      }
    }

    const { data, error } = await query;

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
  
  // Extract cover image from media_assets
  let coverImageUrl: string | null = null;
  if (row.media_assets && row.media_assets.length > 0) {
    // Find image marked as cover
    const coverMedia = row.media_assets.find(
      media => media.metadata && (media.metadata as any).isCover === true
    );
    // Fallback to first image if no cover is marked
    const selectedMedia = coverMedia ?? row.media_assets[0];
    if (selectedMedia?.s3_key) {
      coverImageUrl = selectedMedia.s3_key; // Store s3_key, will be resolved to URL by UI
    }
  }
  
  return {
    id: row.id,
    title: row.title ?? null,
    price: row.price,
    currency: row.currency ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    coverImageUrl,
    operationType: row.operation_type ?? null,
    status: row.status ?? null,
  };
}

function mapParticipants(rows: ThreadRowWithRelations["participants"]): ParticipantDTO[] {
  if (!rows) return [];

  return rows
    .map(row => {
      if (row.user_id) {
        const profileData = (row as any).user_profiles;
        return {
          id: row.user_id,
          type: "user" as const,
          displayName: profileData?.full_name ?? `Usuario ${row.user_id.substring(0, 8)}`,
          email: profileData?.email ?? null,
          phone: profileData?.phone ?? null,
          lastSeenAt: null,
        };
      }
      if (row.contact_id) {
        const contactData = (row as any).contacts;
        return {
          id: row.contact_id,
          type: "contact" as const,
          displayName: contactData?.full_name ?? `Contacto ${row.contact_id.substring(0, 8)}`,
          email: contactData?.email ?? null,
          phone: contactData?.phone ?? null,
          lastSeenAt: null,
        };
      }
      console.warn("Participant without user_id or contact_id", row);
      return null;
    })
    .filter((participant): participant is Exclude<typeof participant, null> => participant !== null);
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
    status: (row.read_at ? "read" : row.delivered_at ? "delivered" : "sent") as "read" | "delivered" | "sent",
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
