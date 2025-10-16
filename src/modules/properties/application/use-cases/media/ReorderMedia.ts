import { reorderMediaSchema } from "../../validators/property.schema";
import type { MediaStorage } from "../../ports/MediaStorage";
import { Result } from "../../_shared/result";

export class ReorderMedia {
  private readonly media: MediaStorage;

  constructor(deps: { media: MediaStorage }) {
    this.media = deps.media;
  }

  async execute(rawInput: unknown): Promise<Result<void>> {
    const parsed = reorderMediaSchema.safeParse(rawInput);
    if (!parsed.success) {
      return Result.fail(parsed.error);
    }

    const uniqueIds = new Set(parsed.data.orderedIds);
    if (uniqueIds.size !== parsed.data.orderedIds.length) {
      return Result.fail(new Error("orderedIds must be unique"));
    }

    const result = await this.media.reorder(
      parsed.data.propertyId,
      parsed.data.orderedIds,
    );
    if (result.isErr()) {
      return Result.fail(result.error);
    }

    return Result.ok(undefined);
  }
}
