import { useCallback } from "react";
// import { supabase } from "../../../core/supabase/client";
import { supabase } from "../../../../core/supabase/client";
import { SupabaseEventRepository } from "../../infrastructure/SupabaseEventRepository";
import { TrackEventUseCase } from "../../application/TrackEventUseCase";
import { GetPropertyMetricsUseCase } from "../../application/GetPropertyMetricsUseCase";
import type { EventType } from "../../domain/entities/Event";

// Singleton instances
const eventRepository = new SupabaseEventRepository(supabase);
const trackEventUseCase = new TrackEventUseCase(eventRepository);
const getPropertyMetricsUseCase = new GetPropertyMetricsUseCase(eventRepository);

/**
 * Hook para registrar eventos de telemetría
 * 
 * @example
 * ```tsx
 * const { trackEvent } = useTelemetry();
 * 
 * // Registrar vista de propiedad
 * trackEvent({
 *   eventType: 'page_view',
 *   propertyId: '123',
 *   metadata: { source: 'home' }
 * });
 * ```
 */
export function useTelemetry() {
  const trackEvent = useCallback(
    async (params: {
      eventType: EventType;
      propertyId?: string;
      userId?: string | null;
      metadata?: Record<string, any>;
    }) => {
      try {
        // Intentar obtener el userId de la sesión actual si no se proporciona
        if (params.userId === undefined) {
          const { data: { user } } = await supabase.auth.getUser();
          params.userId = user?.id ?? null;
        }

        await trackEventUseCase.execute(params);
      } catch (error) {
        // No bloquear la UI si falla el tracking
        console.error("Failed to track event:", error);
      }
    },
    []
  );

  /**
   * Registra una vista de propiedad
   * 
   * @param propertyId - ID de la propiedad vista
   * @param metadata - Metadatos adicionales
   * @param includeUserId - Si true, incluye el userId autenticado. Si false, solo usa fingerprint (para vistas públicas anónimas)
   */
  const trackPropertyView = useCallback(
    async (
      propertyId: string,
      metadata?: Record<string, any>,
      includeUserId: boolean = true
    ) => {
      await trackEvent({
        eventType: "page_view",
        propertyId,
        userId: includeUserId ? undefined : null, // undefined = auto-detect, null = force anonymous
        metadata,
      });
    },
    [trackEvent]
  );

  /**
   * Registra un click en una card de propiedad
   */
  const trackPropertyClick = useCallback(
    async (propertyId: string, metadata?: Record<string, any>) => {
      await trackEvent({
        eventType: "property_click",
        propertyId,
        metadata,
      });
    },
    [trackEvent]
  );

  /**
   * Registra el primer contacto con el propietario
   */
  const trackFirstContact = useCallback(
    async (propertyId: string, metadata?: Record<string, any>) => {
      await trackEvent({
        eventType: "first_contact",
        propertyId,
        metadata,
      });
    },
    [trackEvent]
  );

  /**
   * Registra cuando se comparte una propiedad
   */
  const trackShare = useCallback(
    async (propertyId: string, metadata?: Record<string, any>) => {
      await trackEvent({
        eventType: "share",
        propertyId,
        metadata,
      });
    },
    [trackEvent]
  );

  /**
   * Obtiene las métricas de una propiedad
   */
  const getPropertyMetrics = useCallback(async (propertyId: string) => {
    try {
      return await getPropertyMetricsUseCase.execute(propertyId);
    } catch (error) {
      console.error("Failed to get property metrics:", error);
      return null;
    }
  }, []);

  return {
    trackEvent,
    trackPropertyView,
    trackPropertyClick,
    trackFirstContact,
    trackShare,
    getPropertyMetrics,
  };
}
