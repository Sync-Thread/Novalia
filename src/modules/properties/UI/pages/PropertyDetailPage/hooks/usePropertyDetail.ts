// usePropertyDetail: hook para cargar datos de propiedad pública por ID
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../../../../core/supabase/client";
import { createPropertiesContainer } from "../../../../properties.container";
import { SupabaseAuthService } from "../../../../infrastructure/adapters/SupabaseAuthService";
import { SupabaseMediaStorage } from "../../../../infrastructure/adapters/SupabaseMediaStorage";
import { getPresignedUrlForDisplay } from "../../../../infrastructure/adapters/MediaStorage";
import type { PropertyDTO } from "../../../../application/dto/PropertyDTO";

const authService = new SupabaseAuthService({ client: supabase });
const mediaStorage = new SupabaseMediaStorage({ supabase, authService });

export interface PropertyDetailData {
  property: PropertyDTO;
  coverUrl: string | null;
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

      // Cargar imagen de portada
      let coverUrl: string | null = null;
      const mediaListResult = await mediaStorage.listMedia(propertyId);

      if (mediaListResult.isOk()) {
        const coverMedia = mediaListResult.value.find((m) => m.isCover) 
          || mediaListResult.value[0];

        if (coverMedia?.s3Key) {
          const urlResult = await getPresignedUrlForDisplay(coverMedia.s3Key);
          // getPresignedUrlForDisplay returns string directly
          coverUrl = urlResult;
        }
      }

      setData({ property, coverUrl });
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
