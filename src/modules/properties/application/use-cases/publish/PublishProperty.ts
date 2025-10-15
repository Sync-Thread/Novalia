import { publishPropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { AuthService } from "../../ports/AuthService";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { toDomain } from "../../mappers/property.mapper";

export class PublishProperty {
  private readonly repo: PropertyRepo;
  private readonly auth: AuthService;
  private readonly clock: Clock;

  constructor(deps: { repo: PropertyRepo; auth: AuthService; clock: Clock }) {
    this.repo = deps.repo;
    this.auth = deps.auth;
    this.clock = deps.clock;
  }

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsed = publishPropertySchema.safeParse(rawInput);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const [authResult, propertyResult] = await Promise.all([
      this.auth.getCurrent(),
      this.repo.getById(parsed.data.id),
    ]);

    if (authResult.isErr()) {
      return Result.fail(authResult.error);
    }
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    try {
      const entity = toDomain(propertyResult.value, { clock: this.clock });
      entity.publish({
        now: this.clock.now(),
        kycVerified: authResult.value.kycStatus === "verified",
      });

      const publishedAt = entity.publishedAt ?? this.clock.now();
      const repoResult = await this.repo.publish(entity.id.toString(), publishedAt);
      if (repoResult.isErr()) {
        return Result.fail(repoResult.error);
      }
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error);
    }
  }
}
