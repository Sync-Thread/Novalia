import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import type { ThreadFiltersDTO } from "../../dto/ThreadFiltersDTO";
import type { ListerInboxDTO, ListerThreadGroupDTO } from "../../dto/InboxDTO";
import { DEFAULT_PAGE_SIZE } from "../../dto/PaginationDTO";
import type { ChatThreadDTO } from "../../dto/ChatThreadDTO";
import type { AuthService } from "../../ports/AuthService";
import type { ChatThreadRepo } from "../../ports/ChatThreadRepo";
import { threadFiltersSchema } from "../../validators/threadFilters.schema";

export class ListListerInbox {
  constructor(private readonly deps: { repo: ChatThreadRepo; auth: AuthService }) {}

  async execute(rawFilters: Partial<ThreadFiltersDTO> = {}): Promise<Result<ListerInboxDTO>> {
    const filtersResult = parseWith(threadFiltersSchema, rawFilters);
    if (filtersResult.isErr()) {
      return Result.fail(filtersResult.error);
    }

    const authResult = await this.deps.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }

    const auth = authResult.value;
    const filters = filtersResult.value;
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const repoResult = await this.deps.repo.listForLister({
      ...filters,
      page,
      pageSize,
      userId: auth.userId,
      orgId: auth.orgId,
    });

    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    const grouped = groupThreadsByProperty(repoResult.value.items);

    return Result.ok({
      groups: grouped,
      totalUnread: grouped.reduce((sum, group) => sum + group.unreadCount, 0),
      totalThreads: repoResult.value.total,
    });
  }
}

function groupThreadsByProperty(threads: ChatThreadDTO[]): ListerThreadGroupDTO[] {
  const map = new Map<string, ListerThreadGroupDTO>();

  for (const thread of threads) {
    const propertyId = thread.property?.id ?? "none";
    const existing = map.get(propertyId);
    if (!existing) {
      map.set(propertyId, {
        property: thread.property ?? null,
        threads: [thread],
        threadCount: 1,
        unreadCount: thread.unreadCount,
      });
      continue;
    }
    existing.threads.push(thread);
    existing.threadCount += 1;
    existing.unreadCount += thread.unreadCount;
  }

  return Array.from(map.values()).map(group => ({
    ...group,
    threads: [...group.threads].sort(sortByLastMessage),
  }));
}

function sortByLastMessage(a: ChatThreadDTO, b: ChatThreadDTO): number {
  const aTime = a.lastMessageAt ?? a.createdAt;
  const bTime = b.lastMessageAt ?? b.createdAt;
  return new Date(bTime).getTime() - new Date(aTime).getTime();
}
