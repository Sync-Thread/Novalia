import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import type { PublicPropertyListFiltersDTO, PublicPropertyPage } from "../../dto/PublicPropertyDTO";
import type { PublicPropertyRepo } from "../../ports/PublicPropertyRepo";
import { publicListFiltersSchema } from "../../validators/publicFilters.schema";

export class ListPublishedPropertiesPublic {
  constructor(private readonly deps: { repo: PublicPropertyRepo }) {}

  async execute(
    rawFilters: Partial<PublicPropertyListFiltersDTO> = {},
  ): Promise<Result<PublicPropertyPage>> {
    const filtersResult = parseWith(publicListFiltersSchema, rawFilters);
    if (filtersResult.isErr()) {
      return Result.fail(filtersResult.error);
    }

    const repoResult = await this.deps.repo.listPublished(filtersResult.value);
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    return repoResult;
  }
}
