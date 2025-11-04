// usePropertyDetail: hook para cargar datos de propiedad pública por ID
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../../../../core/supabase/client";
import { createPropertiesContainer } from "../../../../properties.container";
import { SupabaseAuthService } from "../../../../infrastructure/adapters/SupabaseAuthService";
import { SupabaseMediaStorage } from "../../../../infrastructure/adapters/SupabaseMediaStorage";
import { getPresignedUrlForDisplay, getPresignedUrlDirect } from "../../../../infrastructure/adapters/MediaStorage";
import type { PropertyDTO } from "../../../../application/dto/PropertyDTO";

const authService = new SupabaseAuthService({ client: supabase });
const mediaStorage = new SupabaseMediaStorage({ supabase, authService });

export interface PropertyDetailData {
  property: PropertyDTO;
  coverUrl: string | null;
  galleryUrls: string[];
}

export interface UsePropertyDetailResult {
  data: PropertyDetailData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para cargar el detalle de una propiedad pública.
 * Usa GetPublicProperty para obtener datos sin autenticación y carga la imagen de portada.
 */
export function usePropertyDetail(propertyId: string | undefined): UsePropertyDetailResult {
  const [data, setData] = useState<PropertyDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPropertyDetail = useCallback(async () => {
    if (!propertyId) {
      setError("ID de propiedad no válido");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const container = createPropertiesContainer({ client: supabase });
      const result = await container.useCases.getPublicProperty.execute(propertyId);

      if (result.isErr()) {
        const errMsg = result.error instanceof Error 
          ? result.error.message 
          : "Error al cargar la propiedad";
        setError(errMsg);
        setData(null);
        setLoading(false);
        return;
      }

      const property = result.value;

      // Cargar todas las imágenes y videos de la galería
      let coverUrl: string | null = null;
      const galleryUrls: string[] = [];
      const mediaListResult = await mediaStorage.listMedia(propertyId);

      if (mediaListResult.isOk()) {
        // Incluir imágenes y videos
        const allMedia = mediaListResult.value.filter((m) => m.type === "image" || m.type === "video");
        const coverMedia = allMedia.find((m) => m.isCover && m.type === "image") || allMedia.find((m) => m.type === "image") || allMedia[0];

        // Cargar URLs para todas las imágenes y videos en paralelo
        // Para videos usar URL directa (streaming), para imágenes usar blob URL
        const urlPromises = allMedia.map(async (media) => {
          if (media.s3Key) {
            try {
              // Usar URL directa para videos, blob URL para imágenes
              if (media.type === "video") {
                return await getPresignedUrlDirect(media.s3Key);
              } else {
                return await getPresignedUrlForDisplay(media.s3Key);
              }
            } catch {
              return null;
            }
          }
          return null;
        });

        const urls = await Promise.all(urlPromises);
        
        // Filtrar URLs válidas
        const validUrls = urls.filter((url): url is string => url !== null);
        galleryUrls.push(...validUrls);

        // Establecer coverUrl (priorizar imágenes como cover)
        if (coverMedia?.s3Key) {
          coverUrl = await getPresignedUrlForDisplay(coverMedia.s3Key);
        }
      }

      setData({ property, coverUrl, galleryUrls });
      setLoading(false);
    } catch (err) {
      console.error("Error loading property detail:", err);
      setError("Error inesperado al cargar la propiedad");
      setData(null);
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadPropertyDetail();
  }, [loadPropertyDetail]);

  return {
    data,
    loading,
    error,
    refresh: loadPropertyDetail,
  };
}
