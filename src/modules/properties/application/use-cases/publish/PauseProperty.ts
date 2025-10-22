// Caso de uso: pausar una propiedad publicada.
// Respeta reglas de dominio para cambiar de estado.
import { pausePropertySchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import { toDomain } from "../../mappers/property.mapper";

export class PauseProperty {
  constructor(private readonly deps: { repo: PropertyRepo; clock: Clock }) {}

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsedInput = parseWith(pausePropertySchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const propertyResult = await this.deps.repo.getById(parsedInput.value.id);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    const entity = toDomain(propertyResult.value, { clock: this.deps.clock });
    const previousStatus = entity.status;
    entity.pause();
    if (previousStatus === entity.status) {
      return Result.ok(undefined);
    }

    const repoResult = await this.deps.repo.pause(entity.id.toString());
    return repoResult.isErr() ? Result.fail(repoResult.error) : Result.ok(undefined);
  }
}
