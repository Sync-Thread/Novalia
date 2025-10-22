import type { MediaDTO, MediaTypeDTO } from "../../application/dto/MediaDTO";
import type {
  MediaAssetRow,
  MediaInsertPayload,
} from "../types/supabase-rows";

const DB_TO_DTO_MEDIA: Record<string, MediaTypeDTO> = {
  image: "image",
  video: "video",
  document: "floorplan",
};

const DTO_TO_DB_MEDIA: Record<MediaTypeDTO, string> = {
  image: "image",
  video: "video",
  floorplan: "document",
};

export function mapMediaRowToDTO(row: MediaAssetRow): MediaDTO {
  const metadata = (row.metadata as Record<string, unknown> | null) ?? null;
  const variant = (metadata?.variant as MediaTypeDTO | undefined) ?? "image";
  const type = (() => {
    if (row.media_type === "document") {
      return variant;
    }
    return DB_TO_DTO_MEDIA[row.media_type] ?? "image";
  })();

  return {
    id: row.id,
    orgId: row.org_id,
    propertyId: row.property_id,
    url: row.url ?? "",
    s3Key: row.s3_key,
    type,
    position: row.position ?? 0,
    isCover: Boolean(metadata?.isCover),
    metadata,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.created_at ?? undefined,
  };
}

export function mapMediaDtoToInsertPayload(dto: MediaDTO): MediaInsertPayload {
  const metadata = {
    ...(dto.metadata ?? {}),
    isCover: dto.isCover,
    variant: dto.type,
  };

  const orgId = dto.orgId ?? null;

  return {
    id: dto.id,
    org_id: orgId,
    property_id: dto.propertyId ?? null,
    media_type: DTO_TO_DB_MEDIA[dto.type] ?? "image",
    s3_key: dto.s3Key ?? null,
    url: dto.url ?? null,
    position: dto.position,
    metadata,
  };
}
