// Caso de uso: eliminar un archivo multimedia.
// Usa Result para propagar errores de storage.
import { removeMediaSchema } from "../../validators/property.schema";
import type { MediaStorage } from "../../ports/MediaStorage";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";

export class RemoveMedia {
  constructor(private readonly deps: { media: MediaStorage }) {}

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsedInput = parseWith(removeMediaSchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const result = await this.deps.media.remove(parsedInput.value.propertyId, parsedInput.value.mediaId);
    return result.isErr() ? Result.fail(result.error) : Result.ok(undefined);
  }
}
