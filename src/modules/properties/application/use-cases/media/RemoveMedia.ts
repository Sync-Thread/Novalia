import { removeMediaSchema } from "../../validators/property.schema";
import type { MediaStorage } from "../../ports/MediaStorage";
import { Result } from "../../_shared/result";

export class RemoveMedia {
  private readonly media: MediaStorage;

  constructor(deps: { media: MediaStorage }) {
    this.media = deps.media;
  }

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsed = removeMediaSchema.safeParse(rawInput);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const result = await this.media.remove(parsed.data.propertyId, parsed.data.mediaId);
    if (result.isErr()) {
      return Result.fail(result.error);
    }
    return Result.ok(undefined);
  }
}
