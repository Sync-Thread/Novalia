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
    contact_id
  ),
  last_message:chat_messages!left(
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
  ).order(created_at.desc).limit(1)
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
    
    // Obtener perfiles de participantes
    const enrichedRow = await this.enrichParticipants(row);
    
    const unreadCounts = await this.computeUnreadCounts([enrichedRow.id], "user");
    if (unreadCounts.isErr()) {
      return Result.fail(unreadCounts.error);
    }
    const dto = mapThreadRow(enrichedRow, unreadCounts.value);
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
    // Find thread where property_id matches and userId is in participants
    const { data, error } = await this.client
      .from("chat_threads")
      .select(THREAD_SELECT)
      .eq("property_id", input.propertyId)
      .limit(1);

    if (error) {
      return Result.fail(mapPostgrestError("THREAD_QUERY_FAILED", error));
    }

    if (!data || data.length === 0) {
      return Result.ok(null);
    }

    const rows = data as ThreadRowWithRelations[];
    
    // Filter threads where userId is a participant
    const enrichedRows = await Promise.all(
      rows.map(row => this.enrichParticipants(row))
    );

    const matchingThread = enrichedRows.find(row => 
      row.participants?.some(p => p.user_id === input.userId)
    );

    if (!matchingThread) {
      return Result.ok(null);
    }

    const unreadCounts = await this.computeUnreadCounts([matchingThread.id], "user");
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
    
    // Enriquecer participantes con sus perfiles
    const enrichedRows = await Promise.all(
      rows.map(row => this.enrichParticipants(row))
    );
    
    const unreadCounts = await this.computeUnreadCounts(
      enrichedRows.map(row => row.id),
      scope.readerType,
    );
    if (unreadCounts.isErr()) {
      return Result.fail(unreadCounts.error);
    }

    const mapped = enrichedRows
      .map(row => mapThreadRow(row, unreadCounts.value))
      .filter(thread => applySearchFilter(thread, filters.search))
      .filter(thread => (filters.unreadOnly ? thread.unreadCount > 0 : true));

    return Result.ok(buildPage(mapped, count ?? mapped.length, page, pageSize));
  }

  private async enrichParticipants(row: ThreadRowWithRelations): Promise<ThreadRowWithRelations> {
    if (!row.participants || row.participants.length === 0) {
      return row;
    }

    const userIds = row.participants.filter(p => p.user_id).map(p => p.user_id!);
    const contactIds = row.participants.filter(p => p.contact_id).map(p => p.contact_id!);

    // Obtener perfiles de usuarios
    const profilesMap = new Map();
    if (userIds.length > 0) {
      const { data } = await this.client
        .from("profiles")
        .select("id, full_name, avatar_url, email, phone")
        .in("id", userIds);
      
      data?.forEach(profile => profilesMap.set(profile.id, profile));
    }

    // Obtener contactos
    const contactsMap = new Map();
    if (contactIds.length > 0) {
      const { data } = await this.client
        .from("lead_contacts")
        .select("id, full_name, email, phone")
        .in("id", contactIds);
      
      data?.forEach(contact => contactsMap.set(contact.id, contact));
    }

    // Enriquecer participants
    const enrichedParticipants = row.participants.map(p => ({
      ...p,
      user_profiles: p.user_id ? profilesMap.get(p.user_id) : null,
      contacts: p.contact_id ? contactsMap.get(p.contact_id) : null,
    }));

    return {
      ...row,
      participants: enrichedParticipants,
    };
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
          displayName: row.user_profiles?.full_name ?? null,
          avatarUrl: row.user_profiles?.avatar_url ?? null,
          email: row.user_profiles?.email ?? null,
          phone: row.user_profiles?.phone ?? null,
          lastSeenAt: null,
        };
      }
      if (row.contact_id) {
        return {
          id: row.contact_id,
          type: "contact" as const,
          displayName: row.contacts?.full_name ?? null,
          avatarUrl: null,
          email: row.contacts?.email ?? null,
          phone: row.contacts?.phone ?? null,
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
