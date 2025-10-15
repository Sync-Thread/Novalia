import { duplicatePropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { AuthService } from "../../ports/AuthService";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { toDomain } from "../../mappers/property.mapper";
import { UniqueEntityID } from "../../../domain/value-objects/UniqueEntityID";
import { generateId } from "../../_shared/id";

export class DuplicateProperty {
  private readonly repo: PropertyRepo;
  private readonly auth: AuthService;
  private readonly clock: Clock;

  constructor(deps: { repo: PropertyRepo; auth: AuthService; clock: Clock }) {
    this.repo = deps.repo;
    this.auth = deps.auth;
    this.clock = deps.clock;
  }

  async execute(rawInput: unknown): Promise<Result<{ id: string }>> {
    const parsed = duplicatePropertySchema.safeParse(rawInput);
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
      entity.duplicate(
        new UniqueEntityID(generateId()),
        new UniqueEntityID(authResult.value.userId),
        new UniqueEntityID(authResult.value.orgId),
      );
    } catch (error) {
      return Result.fail(error);
    }

    const repoResult = await this.repo.duplicate(parsed.data.id, {
      copyDocs: parsed.data.copyDocs ?? false,
      copyMedia: parsed.data.copyMedia ?? false,
    });
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    return Result.ok(repoResult.value);
  }
}
