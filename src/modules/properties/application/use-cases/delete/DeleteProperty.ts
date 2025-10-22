// Caso de uso: eliminación lógica de propiedades.
// Respetar reglas de dominio (soft delete).
import { deletePropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import { toDomain } from "../../mappers/property.mapper";

export class DeleteProperty {
  constructor(private readonly deps: { repo: PropertyRepo; clock: Clock }) {}

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsedInput = parseWith(deletePropertySchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const propertyResult = await this.deps.repo.getById(parsedInput.value.id);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    const entity = toDomain(propertyResult.value, { clock: this.deps.clock });
    entity.softDelete(this.deps.clock.now());

    const repoResult = await this.deps.repo.softDelete(entity.id.toString());
    return repoResult.isErr() ? Result.fail(repoResult.error) : Result.ok(undefined);
  }
}
