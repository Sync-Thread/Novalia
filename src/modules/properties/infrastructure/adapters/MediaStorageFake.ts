import type { MediaStorage } from "../../application/ports/MediaStorage";
import type { MediaDTO, MediaUploadDTO } from "../../application/dto/MediaDTO";
import { Result } from "../../application/_shared/result";
import type { AuthService } from "../../application/ports/AuthService";
import type { Clock } from "../../application/ports/Clock";

type MediaErrorCode = "AUTH" | "NOT_FOUND" | "INVALID" | "UNKNOWN";

export type MediaInfraError = {
  scope: "media";
  code: MediaErrorCode;
  message: string;
  cause?: unknown;
};

type StoredMedia = MediaDTO & { key: string };
type ObjectRecord = { size?: number; mime?: string; uploadedAt: string };

function mediaError(code: MediaErrorCode, message: string, cause?: unknown): MediaInfraError {
  return { scope: "media", code, message, cause };
}

function normalizeFileName(fileName: string): string {
  const base = fileName.trim().toLowerCase();
  const replaced = base.replace(/[^a-z0-9._-]+/g, "-");
  return replaced.replace(/-+/g, "-");
}

function measureSize(data: ArrayBuffer | Uint8Array): number {
  if (data instanceof ArrayBuffer) {
    return data.byteLength;
  }
  return data.byteLength;
}

export class MediaStorageFake implements MediaStorage {
  private readonly auth: AuthService;
  private readonly clock: Clock;
  private readonly env: string;
  private readonly mediaByProperty = new Map<string, StoredMedia[]>();
  private readonly mediaById = new Map<string, StoredMedia>();
  private readonly objectRegistry = new Map<string, ObjectRecord>();
  private readonly presignTtlMs: number;

  constructor(deps: { auth: AuthService; clock: Clock; env?: string; presignTtlSeconds?: number }) {
    this.auth = deps.auth;
    this.clock = deps.clock;
    const mode =
      typeof import.meta !== "undefined" && typeof import.meta.env?.MODE === "string"
        ? import.meta.env.MODE
        : undefined;
    this.env = deps.env ?? mode ?? "development";
    this.presignTtlMs = (deps.presignTtlSeconds ?? 15 * 60) * 1000;
  }

  async upload(propertyId: string, file: MediaUploadDTO): Promise<Result<MediaDTO>> {
    const authResult = await this.auth.getCurrent();
    if (authResult.isErr()) {
      return Result.fail(mediaError("AUTH", "Cannot resolve authenticated context", authResult.error));
    }

    const { orgId, userId } = authResult.value;
    const now = this.clock.now();
    const nowIso = now.toISOString();
    const mediaId = crypto.randomUUID();
    const key = this.composeKey({
      orgId,
      userId,
      propertyId,
      mediaId,
      fileName: file.fileName,
    });
    const size = measureSize(file.data);
    const propertyMedia = this.mediaByProperty.get(propertyId) ?? [];
    const position = propertyMedia.length;
    const expiresAt = new Date(now.getTime() + this.presignTtlMs).toISOString();

    const stored: StoredMedia = {
      id: mediaId,
      orgId: orgId ?? null,
      propertyId,
      url: key,
      s3Key: key,
      type: file.type,
      position,
      isCover: position === 0,
      metadata: {
        fileName: file.fileName,
        contentType: file.contentType,
        size,
        isCover: position === 0,
        variant: file.type,
        presigned: {
          url: `${key}?uploadToken=${mediaId}`,
          expiresAt,
        },
      },
      createdAt: nowIso,
      updatedAt: nowIso,
      key,
    };

    propertyMedia.push(stored);
    this.mediaByProperty.set(propertyId, propertyMedia);
    this.mediaById.set(mediaId, stored);
    this.objectRegistry.set(key, { size, mime: file.contentType, uploadedAt: nowIso });

    return Result.ok(this.toDto(stored));
  }

  async remove(propertyId: string, mediaId: string): Promise<Result<void>> {
    const stored = this.mediaById.get(mediaId);
    if (!stored || stored.propertyId !== propertyId) {
      return Result.fail(mediaError("NOT_FOUND", "Media asset not found"));
    }

    const propertyMedia = this.mediaByProperty.get(propertyId);
    if (!propertyMedia) {
      return Result.fail(mediaError("NOT_FOUND", "Media asset not found"));
    }

    const index = propertyMedia.findIndex(item => item.id === mediaId);
    if (index === -1) {
      return Result.fail(mediaError("NOT_FOUND", "Media asset not found"));
    }

    propertyMedia.splice(index, 1);
    this.mediaById.delete(mediaId);
    this.objectRegistry.delete(stored.key);

    const nowIso = this.clock.now().toISOString();
    propertyMedia.forEach((item, idx) => {
      item.position = idx;
      item.isCover = idx === 0;
      item.metadata = {
        ...(item.metadata ?? {}),
        isCover: item.isCover,
      };
      item.updatedAt = nowIso;
      this.mediaById.set(item.id, item);
    });

    if (propertyMedia.length === 0) {
      this.mediaByProperty.delete(propertyId);
    }

    return Result.ok(undefined);
  }

  async setCover(propertyId: string, mediaId: string): Promise<Result<void>> {
    const propertyMedia = this.mediaByProperty.get(propertyId);
    if (!propertyMedia) {
      return Result.fail(mediaError("NOT_FOUND", "Media asset not found"));
    }

    const nowIso = this.clock.now().toISOString();
    let updated = false;
    propertyMedia.forEach(item => {
      const isTarget = item.id === mediaId;
      if (isTarget) {
        updated = true;
      }
      item.isCover = isTarget;
      item.metadata = {
        ...(item.metadata ?? {}),
        isCover: item.isCover,
      };
      item.updatedAt = nowIso;
      this.mediaById.set(item.id, item);
    });

    if (!updated) {
      return Result.fail(mediaError("NOT_FOUND", "Media asset not found"));
    }

    return Result.ok(undefined);
  }

  async reorder(propertyId: string, orderedIds: string[]): Promise<Result<void>> {
    const propertyMedia = this.mediaByProperty.get(propertyId);
    if (!propertyMedia || propertyMedia.length === 0) {
      return orderedIds.length === 0
        ? Result.ok(undefined)
        : Result.fail(mediaError("NOT_FOUND", "Media asset not found"));
    }

    const uniqueIds = new Set(orderedIds);
    if (uniqueIds.size !== orderedIds.length) {
      return Result.fail(mediaError("INVALID", "orderedIds contains duplicates"));
    }

    if (orderedIds.length !== propertyMedia.length) {
      return Result.fail(
        mediaError("INVALID", "orderedIds length does not match existing media"),
      );
    }

    const itemsById = new Map(propertyMedia.map(item => [item.id, item] as const));
    for (const id of orderedIds) {
      if (!itemsById.has(id)) {
        return Result.fail(mediaError("NOT_FOUND", "Media asset not found"));
      }
    }

    const nowIso = this.clock.now().toISOString();
    const reordered = orderedIds.map(id => itemsById.get(id)!);

    reordered.forEach((item, index) => {
      item.position = index;
      item.isCover = index === 0;
      item.metadata = {
        ...(item.metadata ?? {}),
        isCover: item.isCover,
      };
      item.updatedAt = nowIso;
      this.mediaById.set(item.id, item);
    });

    propertyMedia.splice(0, propertyMedia.length, ...reordered);
    this.mediaByProperty.set(propertyId, propertyMedia);

    return Result.ok(undefined);
  }

  private composeKey(params: {
    orgId: string | null;
    userId: string;
    propertyId: string;
    mediaId: string;
    fileName: string;
  }): string {
    const safeFile = normalizeFileName(params.fileName);
    const scope = params.orgId ? `org/${params.orgId}` : `user/${params.userId}`;
    return `novalia+fake://env/${this.env}/${scope}/properties/${params.propertyId}/${params.mediaId}/${safeFile}`;
  }

  private toDto(stored: StoredMedia): MediaDTO {
    const { key, ...dto } = stored;
    return dto;
  }
}
