// Caso de uso: reordenar media asegurando ids únicos.
import { reorderMediaSchema } from "../../validators/property.schema";
import type { MediaStorage } from "../../ports/MediaStorage";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";

export class ReorderMedia {
  constructor(private readonly deps: { media: MediaStorage }) {}

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsedInput = parseWith(reorderMediaSchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const uniqueIds = new Set(parsedInput.value.orderedIds);
    if (uniqueIds.size !== parsedInput.value.orderedIds.length) {
      return Result.fail(new Error("orderedIds must be unique"));
    }

    const result = await this.deps.media.reorder(parsedInput.value.propertyId, parsedInput.value.orderedIds);
    return result.isErr() ? Result.fail(result.error) : Result.ok(undefined);
  }
}
