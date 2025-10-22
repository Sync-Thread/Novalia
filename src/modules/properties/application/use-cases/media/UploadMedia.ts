// Caso de uso: subir media asociada a la propiedad.
// Valida entrada y delega en el storage.
import { uploadMediaSchema } from "../../validators/property.schema";
import type { MediaStorage } from "../../ports/MediaStorage";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import { Result } from "../../_shared/result";
import { parseWith } from "../../_shared/validation";
import type { MediaDTO } from "../../dto/MediaDTO";

export class UploadMedia {
  constructor(private readonly deps: { media: MediaStorage; properties: PropertyRepo }) {}

  async execute(rawInput: unknown): Promise<Result<MediaDTO>> {
    const parsedInput = parseWith(uploadMediaSchema, rawInput);
    if (parsedInput.isErr()) {
      return Result.fail(parsedInput.error);
    }

    const propertyResult = await this.deps.properties.getById(parsedInput.value.propertyId);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    const uploadResult = await this.deps.media.upload(parsedInput.value.propertyId, {
      fileName: parsedInput.value.fileName,
      contentType: parsedInput.value.contentType,
      data: parsedInput.value.data,
      type: parsedInput.value.type,
    });

    return uploadResult.isErr() ? Result.fail(uploadResult.error) : Result.ok(uploadResult.value);
  }
}
