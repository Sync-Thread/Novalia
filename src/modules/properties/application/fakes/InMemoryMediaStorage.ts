import type { MediaStorage } from "../ports/MediaStorage";
import type { MediaDTO, MediaUploadDTO } from "../dto/MediaDTO";
import { Result } from "../_shared/result";
import { generateId } from "../_shared/id";

export class InMemoryMediaStorage implements MediaStorage {
  private readonly media: MediaDTO[] = [];

  constructor(seed: MediaDTO[] = []) {
    this.media = seed.map(item => ({ ...item }));
  }

  async upload(propertyId: string, file: MediaUploadDTO): Promise<Result<MediaDTO>> {
    const id = generateId();
    const position = this.media.filter(item => item.propertyId === propertyId).length;
    const record: MediaDTO = {
      id,
      propertyId,
      url: `in-memory://${id}`,
      s3Key: null,
      type: file.type,
      position,
      isCover: position === 0,
      metadata: { fileName: file.fileName, contentType: file.contentType },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.media.push(record);
    return Result.ok({ ...record });
  }

  async remove(propertyId: string, mediaId: string): Promise<Result<void>> {
    const index = this.media.findIndex(item => item.id === mediaId && item.propertyId === propertyId);
    if (index === -1) {
      return Result.fail(new Error("Media not found"));
    }
    this.media.splice(index, 1);
    return Result.ok(undefined);
  }

  async setCover(propertyId: string, mediaId: string): Promise<Result<void>> {
    let found = false;
    this.media.forEach(item => {
      if (item.propertyId === propertyId) {
        if (item.id === mediaId) {
          item.isCover = true;
          found = true;
        } else {
          item.isCover = false;
        }
        item.updatedAt = new Date().toISOString();
      }
    });
    if (!found) {
      return Result.fail(new Error("Media not found"));
    }
    return Result.ok(undefined);
  }

  async reorder(propertyId: string, orderedIds: string[]): Promise<Result<void>> {
    const items = this.media.filter(item => item.propertyId === propertyId);
    if (items.length === 0) {
      return orderedIds.length === 0
        ? Result.ok(undefined)
        : Result.fail(new Error("Media not found"));
    }

    const uniqueIds = new Set(orderedIds);
    if (uniqueIds.size !== orderedIds.length) {
      return Result.fail(new Error("orderedIds contains duplicates"));
    }

    if (orderedIds.length !== items.length) {
      return Result.fail(new Error("orderedIds length does not match existing media"));
    }

    const itemsById = new Map(items.map(item => [item.id, item] as const));
    for (const id of orderedIds) {
      if (!itemsById.has(id)) {
        return Result.fail(new Error("Media not found"));
      }
    }

    const nowIso = new Date().toISOString();
    const reordered = orderedIds.map(id => itemsById.get(id)!);

    reordered.forEach((item, index) => {
      item.position = index;
      item.isCover = index === 0;
      item.updatedAt = nowIso;
      item.metadata = { ...(item.metadata ?? {}), isCover: item.isCover };
    });

    const others = this.media.filter(item => item.propertyId !== propertyId);
    this.media.length = 0;
    this.media.push(...others, ...reordered);

    return Result.ok(undefined);
  }
}
