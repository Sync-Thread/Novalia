// Caso de uso: obtener el detalle de una propiedad.
// Normaliza el DTO después de pasar por el dominio.
import { propertyIdSchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import type { PropertyDTO } from "../../dto/PropertyDTO";
import { toDomain, fromDomain } from "../../mappers/property.mapper";

export class GetProperty {
  constructor(private readonly deps: { repo: PropertyRepo; clock: Clock }) {}

  async execute(rawId: string): Promise<Result<PropertyDTO>> {
    const idResult = parseWith(propertyIdSchema, rawId);
    if (idResult.isErr()) {
      return Result.fail(idResult.error);
    }

    const repoResult = await this.deps.repo.getById(idResult.value);
    if (repoResult.isErr()) {
      return Result.fail(repoResult.error);
    }

    const entity = toDomain(repoResult.value, { clock: this.deps.clock });
    return Result.ok(fromDomain(entity));
  }
}
