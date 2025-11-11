import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import type { ThreadFiltersDTO } from "../../dto/ThreadFiltersDTO";
import type { ClientInboxDTO } from "../../dto/InboxDTO";
import { DEFAULT_PAGE_SIZE } from "../../dto/PaginationDTO";
import type { AuthService } from "../../ports/AuthService";
import type { ChatThreadRepo } from "../../ports/ChatThreadRepo";
import { threadFiltersSchema } from "../../validators/threadFilters.schema";

export class ListClientInbox {
  constructor(private readonly deps: { repo: ChatThreadRepo; auth: AuthService }) {}

  async execute(rawFilters: Partial<ThreadFiltersDTO> = {}): Promise<Result<ClientInboxDTO>> {
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
    const contactId = filters.contactId ?? auth.contactId ?? null;

    if (!contactId) {
      return Result.fail({
        scope: "chat",
        code: "CONTACT_REQUIRED",
        message: "No se pudo determinar el contacto del cliente",
      });
    }

    const repoResult = await this.deps.repo.listForContact({
      ...filters,
      contactId,
      orgId: auth.orgId,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
    });

    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    const thread = repoResult.value.items[0] ?? null;

    return Result.ok({
      property: thread?.property ?? null,
      unreadCount: thread?.unreadCount ?? 0,
      thread,
    });
  }
}
