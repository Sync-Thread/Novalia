import { schedulePublishSchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { toDomain } from "../../mappers/property.mapper";

export class SchedulePublish {
  private readonly repo: PropertyRepo;
  private readonly clock: Clock;

  constructor(deps: { repo: PropertyRepo; clock: Clock }) {
    this.repo = deps.repo;
    this.clock = deps.clock;
  }

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsed = schedulePublishSchema.safeParse(rawInput);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const propertyResult = await this.repo.getById(parsed.data.id);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    try {
      const entity = toDomain(propertyResult.value, { clock: this.clock });
      entity.schedulePublication(parsed.data.publishAt);
      const repoResult = await this.repo.publish(entity.id.toString(), parsed.data.publishAt);
      if (repoResult.isErr()) {
        return Result.fail(repoResult.error);
      }
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error);
    }
  }
}
