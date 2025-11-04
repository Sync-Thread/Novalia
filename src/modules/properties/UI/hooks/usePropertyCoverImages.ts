import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../../core/supabase/client";
import { SupabaseMediaStorage } from "../../infrastructure/adapters/SupabaseMediaStorage";
import { SupabaseAuthService } from "../../infrastructure/adapters/SupabaseAuthService";
import { getPresignedUrlForDisplay } from "../../infrastructure/adapters/MediaStorage";

const authService = new SupabaseAuthService({ client: supabase });
const mediaStorage = new SupabaseMediaStorage({ supabase, authService });

/**
 * Hook para obtener las URLs de portada de múltiples propiedades
 * Carga las imágenes de portada (isCover: true) y genera blob URLs locales
 */
export function usePropertyCoverImages(propertyIds: string[]) {
  const [coverUrls, setCoverUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  const loadCoverImages = useCallback(async () => {
    if (propertyIds.length === 0) {
      setCoverUrls({});
      return;
    }

    setLoading(true);
    const urlsMap: Record<string, string | null> = {};

    try {
      // Cargar imágenes en paralelo para todas las propiedades
      await Promise.allSettled(
        propertyIds.map(async (propertyId) => {
          try {
            // 1. Obtener todos los media de la propiedad
            const mediaResult = await mediaStorage.listMedia(propertyId);

            if (mediaResult.isErr()) {
              console.warn(`No se pudo cargar media para propiedad ${propertyId}`);
              urlsMap[propertyId] = null;
              return;
            }

            const mediaItems = mediaResult.value;

            // 2. Encontrar la imagen de portada (isCover: true)
            const coverImage = mediaItems.find(
              (item) => item.isCover && item.type === "image"
            );

            // Si no hay portada marcada, usar la primera imagen
            const fallbackImage = mediaItems.find((item) => item.type === "image");
            const selectedImage = coverImage || fallbackImage;

            if (!selectedImage?.s3Key) {
              urlsMap[propertyId] = null;
              return;
            }

            // 3. Obtener presigned URL y convertir a blob URL
            const blobUrl = await getPresignedUrlForDisplay(selectedImage.s3Key);
            urlsMap[propertyId] = blobUrl;
          } catch (error) {
            console.error(`Error cargando portada para ${propertyId}:`, error);
            urlsMap[propertyId] = null;
          }
        })
      );

      setCoverUrls(urlsMap);
    } catch (error) {
      console.error("Error general cargando portadas:", error);
    } finally {
      setLoading(false);
    }
  }, [propertyIds]);

  useEffect(() => {
    loadCoverImages();
  }, [loadCoverImages]);

  return { coverUrls, loading, reload: loadCoverImages };
}
