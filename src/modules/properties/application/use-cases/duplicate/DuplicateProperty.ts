// Caso de uso: duplicar una propiedad con media y documentos opcionales.
// Se apoya en el dominio para validar identidad nueva.
import { duplicatePropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { AuthService } from "../../ports/AuthService";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import { toDomain } from "../../mappers/property.mapper";
import { UniqueEntityID } from "../../../domain/value-objects/UniqueEntityID";
import { generateId } from "../../_shared/id";

export class DuplicateProperty {
  constructor(
    private readonly deps: { repo: PropertyRepo; auth: AuthService; clock: Clock },
  ) {}

  async execute(rawInput: unknown): Promise<Result<{ id: string }>> {
    const payloadResult = parseWith(duplicatePropertySchema, rawInput);
    if (payloadResult.isErr()) {
      return Result.fail(payloadResult.error);
    }

    const [authResult, propertyResult] = await Promise.all([
      this.deps.auth.getCurrent(),
      this.deps.repo.getById(payloadResult.value.id),
    ]);
    if (authResult.isErr()) return Result.fail(authResult.error);
    if (propertyResult.isErr()) return Result.fail(propertyResult.error);

    const { orgId, userId } = authResult.value;
    const entity = toDomain(propertyResult.value, { clock: this.deps.clock });
    entity.duplicate(
      new UniqueEntityID(generateId()),
      new UniqueEntityID(userId),
      new UniqueEntityID(orgId),
    );

    const repoResult = await this.deps.repo.duplicate(payloadResult.value.id, {
      copyDocs: payloadResult.value.copyDocs ?? false,
      copyMedia: payloadResult.value.copyMedia ?? false,
    });
    return repoResult.isErr() ? Result.fail(repoResult.error) : Result.ok(repoResult.value);
  }
}
