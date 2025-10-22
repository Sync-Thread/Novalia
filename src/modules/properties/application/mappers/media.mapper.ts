import { MediaAsset } from "../../domain/entities/MediaAsset";
import { MEDIA_TYPE } from "../../domain/enums";
import type { DomainClock } from "../../domain/clock";
import { UniqueEntityID } from "../../domain/value-objects/UniqueEntityID";
import type { MediaDTO } from "../dto/MediaDTO";

function resolveDomainType(type: MediaDTO["type"]): (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE] {
  if (type === "floorplan") {
    return MEDIA_TYPE.Document;
  }
  return type as (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE];
}

function resolveDtoType(type: (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE], metadata?: Record<string, unknown> | null): MediaDTO["type"] {
  if (type === MEDIA_TYPE.Document) {
    const variant = metadata?.variant;
    if (variant === "floorplan") {
      return "floorplan";
    }
    return "floorplan";
  }
  if (type === MEDIA_TYPE.Image) return "image";
  if (type === MEDIA_TYPE.Video) return "video";
  return "image";
}

export function toDomain(dto: MediaDTO, deps: { clock: DomainClock; orgId: string; propertyId?: string | null }): MediaAsset {
  const metadata = { ...(dto.metadata ?? {}), isCover: dto.isCover, variant: dto.type };
  return new MediaAsset(
    {
      id: new UniqueEntityID(dto.id),
      orgId: new UniqueEntityID(deps.orgId),
      propertyId: deps.propertyId ? new UniqueEntityID(deps.propertyId) : null,
      type: resolveDomainType(dto.type),
      position: dto.position ?? 0,
      s3Key: dto.s3Key ?? null,
      url: dto.url,
      metadata,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
    },
    { clock: deps.clock },
  );
}

export function fromDomain(media: MediaAsset): MediaDTO {
  const metadata = media.metadata ?? null;
  return {
    id: media.id.toString(),
    orgId: media.orgId.toString(),
    propertyId: media.propertyId?.toString() ?? null,
    url: media.url ?? "",
    s3Key: media.s3Key ?? null,
    type: resolveDtoType(media.type, metadata ?? undefined),
    position: media.position,
    isCover: Boolean(metadata?.isCover),
    metadata,
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
  };
}
