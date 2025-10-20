// Caso de uso: marcar una propiedad como vendida.
// Usa el dominio para validar la fecha y persistir el estado.
import { markSoldSchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import { toDomain } from "../../mappers/property.mapper";

export class MarkSold {
  constructor(private readonly deps: { repo: PropertyRepo; clock: Clock }) {}

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsedInput = parseWith(markSoldSchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const propertyResult = await this.deps.repo.getById(parsedInput.value.id);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    const entity = toDomain(propertyResult.value, { clock: this.deps.clock });
    entity.markSold(parsedInput.value.soldAt);

    const repoResult = await this.deps.repo.markSold(entity.id.toString(), parsedInput.value.soldAt);
    return repoResult.isErr() ? Result.fail(repoResult.error) : Result.ok(undefined);
  }
}
