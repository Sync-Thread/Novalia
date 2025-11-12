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

  async execute(rawFilters: Partial<ThreadFiltersDTO> = {}): Promise<Result<ClientInboxDTO[]>> {
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
    
    // ✅ FIX: Aceptar userId (usuarios autenticados) O contactId (leads)
    // Prioridad: filtro explícito > contactId de auth > userId de auth
    const contactId = filters.contactId ?? auth.contactId ?? null;
    const userId = auth.userId ?? null;

    // Debe tener al menos uno de los dos
    if (!contactId && !userId) {
      return Result.fail({
        scope: "chat",
        code: "USER_REQUIRED",
        message: "No se pudo determinar el identificador del usuario o contacto",
      });
    }
    
    // ✅ FIX: Si es usuario autenticado (no lead), usar listForLister
    // Si es lead (contactId), usar listForContact
    // En ambos casos, retornar TODOS los threads (no solo uno)
    const repoResult = contactId 
      ? await this.deps.repo.listForContact({
          ...filters,
          contactId,
          orgId: auth.orgId,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 100, // Aumentar para mostrar todos
        })
      : await this.deps.repo.listForLister({
          ...filters,
          userId: userId!,
          orgId: auth.orgId,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 100, // Aumentar para mostrar todos
        });

    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    // ✅ Retornar TODOS los threads como array de ClientInboxDTO
    const threads = repoResult.value.items;
    const inboxes = threads.map(thread => ({
      property: thread.property ?? null,
      unreadCount: thread.unreadCount ?? 0,
      thread,
    }));

    return Result.ok(inboxes);
  }
}
