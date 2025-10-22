// Caso de uso: publicar una propiedad si cumple políticas de dominio.
// Mantener verificación de KYC y fecha de publicación.
import { publishPropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { AuthService } from "../../ports/AuthService";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import { toDomain } from "../../mappers/property.mapper";

export class PublishProperty {
  constructor(
    private readonly deps: { repo: PropertyRepo; auth: AuthService; clock: Clock },
  ) {}

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsedInput = parseWith(publishPropertySchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const [authResult, propertyResult] = await Promise.all([
      this.deps.auth.getCurrent(),
      this.deps.repo.getById(parsedInput.value.id),
    ]);
    if (authResult.isErr()) return Result.fail(authResult.error);
    if (propertyResult.isErr()) return Result.fail(propertyResult.error);

    const entity = toDomain(propertyResult.value, { clock: this.deps.clock });
    entity.publish({
      now: this.deps.clock.now(),
      kycVerified: authResult.value.kycStatus === "verified",
    });

    const publishedAt = entity.publishedAt ?? this.deps.clock.now();
    const repoResult = await this.deps.repo.publish(entity.id.toString(), publishedAt);
    return repoResult.isErr() ? Result.fail(repoResult.error) : Result.ok(undefined);
  }
}
