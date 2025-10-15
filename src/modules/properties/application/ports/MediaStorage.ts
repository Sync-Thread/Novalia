import type { MediaDTO, MediaUploadDTO } from "../dto/MediaDTO";
import type { Result } from "../_shared/result";

export interface MediaStorage {
  upload(propertyId: string, file: MediaUploadDTO): Promise<Result<MediaDTO>>;
  remove(propertyId: string, mediaId: string): Promise<Result<void>>;
  setCover(propertyId: string, mediaId: string): Promise<Result<void>>;
}
