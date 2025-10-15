import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import type { PropertyDTO, Page } from "../../dto/PropertyDTO";
import type { ListFiltersDTO } from "../../dto/FiltersDTO";
import { listFiltersSchema } from "../../validators/filters.schema";
import { toDomain, fromDomain } from "../../mappers/property.mapper";

export class ListProperties {
  private readonly repo: PropertyRepo;
  private readonly clock: Clock;

  constructor(deps: { repo: PropertyRepo; clock: Clock }) {
    this.repo = deps.repo;
    this.clock = deps.clock;
  }

  async execute(rawFilters: Partial<ListFiltersDTO> = {}): Promise<Result<Page<PropertyDTO>>> {
    const parsed = listFiltersSchema.safeParse(rawFilters);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const filters = { ...parsed.data };
    if (filters.status === "all") {
      delete filters.status;
    }

    const repoResult = await this.repo.list(filters as ListFiltersDTO);
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    const page = repoResult.value;
    const normalizedItems = page.items.map(dto => {
      const entity = toDomain(dto, { clock: this.clock });
      return fromDomain(entity);
    });

    return Result.ok({ ...page, items: normalizedItems });
  }
}
