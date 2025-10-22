// Caso de uso: programar publicación futura de una propiedad.
// Delega la validación temporal al dominio.
import { schedulePublishSchema } from "../../validators/property.schema";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import type { Clock } from "../../ports/Clock";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import { toDomain } from "../../mappers/property.mapper";

export class SchedulePublish {
  constructor(private readonly deps: { repo: PropertyRepo; clock: Clock }) {}

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsedInput = parseWith(schedulePublishSchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const propertyResult = await this.deps.repo.getById(parsedInput.value.id);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    const entity = toDomain(propertyResult.value, { clock: this.deps.clock });
    entity.schedulePublication(parsedInput.value.publishAt);

    const repoResult = await this.deps.repo.publish(entity.id.toString(), parsedInput.value.publishAt);
    return repoResult.isErr() ? Result.fail(repoResult.error) : Result.ok(undefined);
  }
}
