import { uploadMediaSchema } from "../../validators/property.schema";
import type { MediaStorage } from "../../ports/MediaStorage";
import type { PropertyRepo } from "../../ports/PropertyRepo";
import { Result } from "../../_shared/result";
import type { MediaDTO } from "../../dto/MediaDTO";

export class UploadMedia {
  private readonly media: MediaStorage;
  private readonly properties: PropertyRepo;

  constructor(deps: { media: MediaStorage; properties: PropertyRepo }) {
    this.media = deps.media;
    this.properties = deps.properties;
  }

  async execute(rawInput: unknown): Promise<Result<MediaDTO>> {
    const parsed = uploadMediaSchema.safeParse(rawInput);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const propertyResult = await this.properties.getById(parsed.data.propertyId);
    if (propertyResult.isErr()) {
      return Result.fail(propertyResult.error);
    }

    const uploadResult = await this.media.upload(parsed.data.propertyId, {
      fileName: parsed.data.fileName,
      contentType: parsed.data.contentType,
      data: parsed.data.data,
      type: parsed.data.type,
    });
    if (uploadResult.isErr()) {
      return Result.fail(uploadResult.error);
    }

    return Result.ok(uploadResult.value);
  }
}
