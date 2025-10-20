// Caso de uso: marcar media como portada.
import { setCoverMediaSchema } from "../../validators/property.schema";
import type { MediaStorage } from "../../ports/MediaStorage";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";

export class SetCoverMedia {
  constructor(private readonly deps: { media: MediaStorage }) {}

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsedInput = parseWith(setCoverMediaSchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const result = await this.deps.media.setCover(parsedInput.value.propertyId, parsedInput.value.mediaId);
    return result.isErr() ? Result.fail(result.error) : Result.ok(undefined);
  }
}
