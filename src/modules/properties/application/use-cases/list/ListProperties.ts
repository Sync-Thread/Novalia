// Caso de uso: listar propiedades con filtros paginados.
// Normaliza DTOs tras pasar por dominio.
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import type { PropertyDTO, Page } from "../../dto/PropertyDTO";
import type { ListFiltersDTO } from "../../dto/FiltersDTO";
import { listFiltersSchema } from "../../validators/filters.schema";
import { parseWith } from "../../_shared/validation";
import { toDomain, fromDomain } from "../../mappers/property.mapper";

export class ListProperties {
  constructor(private readonly deps: { repo: PropertyRepo; clock: Clock }) {}

  async execute(rawFilters: Partial<ListFiltersDTO> = {}): Promise<Result<Page<PropertyDTO>>> {
    const filtersResult = parseWith(listFiltersSchema, rawFilters);
    if (filtersResult.isErr()) {
      return Result.fail(filtersResult.error);
    }

    const filters = normalizeFilters(filtersResult.value);
    const repoResult = await this.deps.repo.list(filters);
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    const normalizedItems = repoResult.value.items.map(item =>
      fromDomain(toDomain(item, { clock: this.deps.clock })),
    );

    return Result.ok({ ...repoResult.value, items: normalizedItems });
  }
}

function normalizeFilters(filters: ListFiltersDTO): ListFiltersDTO {
  const normalized: ListFiltersDTO = { ...filters };
  if (normalized.status === "all") {
    delete (normalized as { status?: string }).status;
  }
  return normalized;
}
