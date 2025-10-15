import { propertyIdSchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import type { PropertyDTO } from "../../dto/PropertyDTO";
import { toDomain, fromDomain } from "../../mappers/property.mapper";

export class GetProperty {
  private readonly repo: PropertyRepo;
  private readonly clock: Clock;

  constructor(deps: { repo: PropertyRepo; clock: Clock }) {
    this.repo = deps.repo;
    this.clock = deps.clock;
  }

  async execute(rawId: string): Promise<Result<PropertyDTO>> {
    const parsed = propertyIdSchema.safeParse(rawId);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const repoResult = await this.repo.getById(parsed.data);
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    const entity = toDomain(repoResult.value, { clock: this.clock });
    return Result.ok(fromDomain(entity));
  }
}
