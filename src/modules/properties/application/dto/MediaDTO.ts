export type MediaTypeDTO = "image" | "video" | "document";

export interface MediaDTO {
  id: string;
  orgId?: string | null;
  propertyId?: string | null;
  url: string;
  s3Key?: string | null;
  type: MediaTypeDTO;
  position: number;
  isCover: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaUploadDTO {
  fileName: string;
  contentType: string;
  data: ArrayBuffer | Uint8Array;
  type: MediaTypeDTO;
}
