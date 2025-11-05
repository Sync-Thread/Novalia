import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaStorage } from "../../application/ports/MediaStorage";
import type { MediaDTO, MediaUploadDTO } from "../../application/dto/MediaDTO";
import type { AuthService } from "../../application/ports/AuthService";
import { Result } from "../../application/_shared/result";

type MediaErrorCode = "AUTH" | "NOT_FOUND" | "VALIDATION" | "UNKNOWN";

export type MediaInfraError = {
  scope: "media";
  code: MediaErrorCode;
  message: string;
  cause?: unknown;
};

function mediaError(
  code: MediaErrorCode,
  message: string,
  cause?: unknown
): MediaInfraError {
  return { scope: "media", code, message, cause };
}

/**
 * Adaptador de Supabase para MediaStorage que guarda registros en media_assets
 */
export class SupabaseMediaStorage implements MediaStorage {
  private readonly supabase: SupabaseClient;
  private readonly authService: AuthService;

  constructor(deps: { supabase: SupabaseClient; authService: AuthService }) {
    this.supabase = deps.supabase;
    this.authService = deps.authService;
  }

  /**
   * Sube un archivo y registra en media_assets
   */
  async upload(
    propertyId: string,
    file: MediaUploadDTO
  ): Promise<Result<MediaDTO>> {
    try {
      const authResult = await this.authService.getCurrent();
      if (authResult.isErr()) {
        return Result.fail(mediaError("AUTH", "Not authenticated", authResult.error));
      }
      
      // const profile = authResult.value;
      // if (!profile.orgId) {
      //   return Result.fail(mediaError("AUTH", "No org context available"));
      // }

      // 1. Determinar posición (última + 1)
      const { data: existingMedia, error: countError } = await this.supabase
        .from("media_assets")
        .select("position")
        .eq("property_id", propertyId)
        .order("position", { ascending: false })
        .limit(1);

      if (countError) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to get media count", countError)
        );
      }

      const nextPosition =
        existingMedia && existingMedia.length > 0
          ? (existingMedia[0].position ?? 0) + 1
          : 0;

      // 2. Determinar si es la primera imagen (será cover)
      const { count: imageCount, error: imageCountError } = await this.supabase
        .from("media_assets")
        .select("*", { count: "exact", head: true })
        .eq("property_id", propertyId)
        .eq("media_type", "image");

      if (imageCountError) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to count images", imageCountError)
        );
      }

      const isCover = (imageCount ?? 0) === 0 && file.type === "image";

      // 3. Generar s3_key y url simulada (esto debería venir del upload a S3)
      // Por ahora, asumimos que el archivo ya fue subido a S3 antes de llamar a este método
      const s3Key = `properties/${propertyId}/${Date.now()}-${file.fileName}`;
      const url = `https://your-bucket.s3.amazonaws.com/${s3Key}`; // Placeholder

      // 4. Insertar en media_assets
      const { data, error } = await this.supabase
        .from("media_assets")
        .insert({
          // org_id: profile.orgId,
          property_id: propertyId,
          media_type: file.type,
          s3_key: s3Key,
          url: url,
          position: nextPosition,
          metadata: {
            fileName: file.fileName,
            contentType: file.contentType,
            size: file.data.byteLength,
            uploadedAt: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (error) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to insert media", error)
        );
      }

      // 5. Mapear a MediaDTO
      const mediaDTO: MediaDTO = {
        id: data.id,
        orgId: data.org_id,
        propertyId: data.property_id,
        url: data.url,
        s3Key: data.s3_key,
        type: data.media_type,
        position: data.position ?? 0,
        isCover: isCover,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.created_at, // media_assets no tiene updated_at
      };

      return Result.ok(mediaDTO);
    } catch (error) {
      return Result.fail(
        mediaError("UNKNOWN", "Unexpected error uploading media", error)
      );
    }
  }

  /**
   * Elimina un media asset
   */
  async remove(propertyId: string, mediaId: string): Promise<Result<void>> {
    try {
      const authResult = await this.authService.getCurrent();
      if (authResult.isErr()) {
        return Result.fail(mediaError("AUTH", "Not authenticated", authResult.error));
      }
      
      // const profile = authResult.value;
      // if (!profile.orgId) {
      //   return Result.fail(mediaError("AUTH", "No org context available"));
      // }

      const { error } = await this.supabase
        .from("media_assets")
        .delete()
        .eq("id", mediaId)
        .eq("property_id", propertyId)
        // .eq("org_id", profile.orgId);

      if (error) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to delete media", error)
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        mediaError("UNKNOWN", "Unexpected error removing media", error)
      );
    }
  }

  /**
   * Marca un media como portada (cover)
   * Actualiza metadata.isCover = true para el media seleccionado
   */
  async setCover(propertyId: string, mediaId: string): Promise<Result<void>> {
    try {
      console.log('llego? id');
      
      const authResult = await this.authService.getCurrent();
      if (authResult.isErr()) {
        console.log('error auth');
        
        return Result.fail(mediaError("AUTH", "Not authenticated", authResult.error));
      }
      
      // const profile = authResult.value;
      // if (!profile.orgId) {
      //   console.log('fallo la organizacion');
        
      //   return Result.fail(mediaError("AUTH", "No org context available"));
      // }
      // else{
      //   console.log('no fallo org');
      // }

      // Estrategia: actualizar metadata para marcar isCover
      const { data: targetMedia, error: fetchError } = await this.supabase
        .from("media_assets")
        .select("metadata")
        .eq("id", mediaId)
        .eq("property_id", propertyId)
        .single();

      if (fetchError) {
        return Result.fail(
          mediaError("NOT_FOUND", "Media not found", fetchError)
        );
      }

      // Remover isCover de otros medios de la propiedad
      const { data: allMedia, error: allError } = await this.supabase
        .from("media_assets")
        .select("id, metadata")
        .eq("property_id", propertyId);
        // .eq("org_id", profile.orgId);

      if (allError) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to fetch all media", allError)
        );
      }

      // Actualizar todos quitando isCover
      for (const media of allMedia ?? []) {
        const metadata = (media.metadata as any) || {};
        delete metadata.isCover;

        await this.supabase
          .from("media_assets")
          .update({ metadata })
          .eq("id", media.id);
      }

      // Marcar el target como cover
      const updatedMetadata = {
        ...(targetMedia.metadata as any || {}),
        isCover: true,
      };

      const { error: updateError } = await this.supabase
        .from("media_assets")
        .update({ metadata: updatedMetadata })
        .eq("id", mediaId);

      if (updateError) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to set cover", updateError)
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        mediaError("UNKNOWN", "Unexpected error setting cover", error)
      );
    }
  }

  /**
   * Reordena media assets actualizando position
   */
  async reorder(
    propertyId: string,
    orderedIds: string[]
  ): Promise<Result<void>> {
    try {
      const authResult = await this.authService.getCurrent();
      if (authResult.isErr()) {
        return Result.fail(mediaError("AUTH", "Not authenticated", authResult.error));
      }
      
      // const profile = authResult.value;
      // if (!profile.orgId) {
      //   return Result.fail(mediaError("AUTH", "No org context available"));
      // }

      // Actualizar position de cada media según el orden
      const updates = orderedIds.map((id, index) =>
        this.supabase
          .from("media_assets")
          .update({ position: index })
          .eq("id", id)
          .eq("property_id", propertyId)
          // .eq("org_id", profile.orgId)
      );

      await Promise.all(updates);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        mediaError("UNKNOWN", "Unexpected error reordering media", error)
      );
    }
  }

  /**
   * Método auxiliar para insertar media con todos los datos de S3
   */
  async insertMediaFromS3(params: {
    propertyId: string;
    s3Key: string;
    url: string;
    type: "image" | "video" | "document";
    fileName: string;
    contentType: string;
    size: number;
  }): Promise<Result<MediaDTO>> {
    try {
      const authResult = await this.authService.getCurrent();
      if (authResult.isErr()) {
        return Result.fail(mediaError("AUTH", "Not authenticated", authResult.error));
      }
      
      // const profile = authResult.value;
      // if (!profile.orgId) {
      //   return Result.fail(mediaError("AUTH", "No org context available"));
      // }

      // Determinar posición
      const { data: existingMedia, error: countError } = await this.supabase
        .from("media_assets")
        .select("position")
        .eq("property_id", params.propertyId)
        .order("position", { ascending: false })
        .limit(1);

      if (countError) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to get media count", countError)
        );
      }

      const nextPosition =
        existingMedia && existingMedia.length > 0
          ? (existingMedia[0].position ?? 0) + 1
          : 0;

      // Determinar si es cover (primera imagen)
      const { count: imageCount, error: imageCountError } = await this.supabase
        .from("media_assets")
        .select("*", { count: "exact", head: true })
        .eq("property_id", params.propertyId)
        .eq("media_type", "image");

      if (imageCountError) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to count images", imageCountError)
        );
      }

      const isCover = (imageCount ?? 0) === 0 && params.type === "image";

      // Insertar
      const { data, error } = await this.supabase
        .from("media_assets")
        .insert({
          // org_id: profile.orgId,
          property_id: params.propertyId,
          media_type: params.type,
          s3_key: params.s3Key,
          url: params.url,
          position: nextPosition,
          metadata: {
            fileName: params.fileName,
            contentType: params.contentType,
            size: params.size,
            uploadedAt: new Date().toISOString(),
            isCover: isCover,
          },
        })
        .select()
        .single();

      if (error) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to insert media", error)
        );
      }

      const mediaDTO: MediaDTO = {
        id: data.id,
        orgId: data.org_id,
        propertyId: data.property_id,
        url: data.url,
        s3Key: data.s3_key,
        type: data.media_type,
        position: data.position ?? 0,
        isCover: isCover,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.created_at,
      };

      return Result.ok(mediaDTO);
    } catch (error) {
      return Result.fail(
        mediaError("UNKNOWN", "Unexpected error inserting media", error)
      );
    }
  }

  /**
   * Lista todos los media assets de una propiedad
   */
  async listMedia(propertyId: string): Promise<Result<MediaDTO[]>> {
    try {
      console.log('list media');
      
      const authResult = await this.authService.getCurrent();
      console.log('auth: ', authResult);
      
      if (authResult.isErr()) {
        return Result.fail(mediaError("AUTH", "Not authenticated", authResult.error));
      }
      
      // const profile = authResult.value;
      // if (!profile.orgId) {
      //   return Result.fail(mediaError("AUTH", "No org context available"));
      // }

      const { data, error } =  await this.supabase
        .from("media_assets")
        .select("*")
        .eq("property_id", propertyId)
        // .eq("org_id", profile.orgId)
        .order("position", { ascending: true });

      

      if (error) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to list media", error)
        );
      }

      const mediaList: MediaDTO[] = (data ?? []).map((row) => ({
        id: row.id,
        orgId: row.org_id,
        propertyId: row.property_id,
        url: row.url,
        s3Key: row.s3_key,
        type: row.media_type,
        position: row.position ?? 0,
        isCover: (row.metadata as any)?.isCover ?? false,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.created_at,
      }));

      return Result.ok(mediaList);
    } catch (error) {
      return Result.fail(
        mediaError("UNKNOWN", "Unexpected error listing media", error)
      );
    }
  }

  /**
   * Obtiene todos los s3Keys de media assets de una propiedad
   * Útil para eliminación en lote de archivos de S3
   */
  async getAllS3Keys(propertyId: string): Promise<Result<string[]>> {
    try {
      const authResult = await this.authService.getCurrent();
      if (authResult.isErr()) {
        return Result.fail(mediaError("AUTH", "Not authenticated", authResult.error));
      }

      const { data, error } = await this.supabase
        .from("media_assets")
        .select("s3_key")
        .eq("property_id", propertyId);

      if (error) {
        return Result.fail(
          mediaError("UNKNOWN", "Failed to get media s3 keys", error)
        );
      }

      const s3Keys = (data ?? [])
        .map((row) => row.s3_key)
        .filter((key): key is string => typeof key === "string" && key.length > 0);

      return Result.ok(s3Keys);
    } catch (error) {
      return Result.fail(
        mediaError("UNKNOWN", "Unexpected error getting s3 keys", error)
      );
    }
  }
}
