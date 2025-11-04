import type { SupabaseClient } from "@supabase/supabase-js";
import type { Event, PropertyMetrics } from "../domain/entities/Event";
import type { EventRepository } from "../domain/ports/EventRepository";

interface MetricsRow {
  property_id: string;
  views_count: number;
  clicks_count: number;
  contacts_count: number;
  shares_count: number;
  chat_messages_count: number;
  last_event_at: string | null;
  updated_at: string;
}

/**
 * Implementación de EventRepository usando Supabase
 */
export class SupabaseEventRepository implements EventRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Genera un fingerprint simple del navegador
   * En producción considera usar una librería como FingerprintJS
   */
  private generateFingerprint(): string {
    const userAgent = navigator.userAgent;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Crear un hash simple
    const data = `${userAgent}-${screenWidth}-${screenHeight}-${timezone}`;
    
    // Usar un hash simple (en producción usa una librería mejor)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  async trackEvent(event: Event): Promise<Event> {
    try {
      // Generar fingerprint del navegador
      const fingerprint = this.generateFingerprint();
      
      console.log("🔍 Tracking event:", {
        eventType: event.eventType,
        propertyId: event.propertyId,
        userId: event.userId,
        fingerprint,
      });
      
      // Preparar metadata incluyendo userAgent
      const metadata = {
        ...event.metadata,
        userAgent: navigator.userAgent,
      };

      // Llamar a la función RPC
      console.log("📡 Calling RPC track_property_event with:", {
        p_fingerprint_hash: fingerprint,
        p_property_id: event.propertyId ?? null,
        p_user_id: event.userId ?? null,
        p_event_type: event.eventType,
        p_metadata: metadata,
      });

      const { data, error } = await this.supabase.rpc('track_property_event', {
        p_fingerprint_hash: fingerprint,
        p_property_id: event.propertyId ?? null,
        p_user_id: event.userId ?? null,
        p_event_type: event.eventType,
        p_metadata: metadata,
      });

      console.log("📥 RPC Response:", { data, error });

      if (error) {
        console.error("❌ Error tracking event:", error);
        throw new Error(`Failed to track event: ${error.message}`);
      }

      // Si hay un error en la respuesta
      if (data && data.error) {
        console.error("❌ Error from RPC function:", data.error);
        throw new Error(`RPC error: ${data.error}`);
      }

      console.log("✅ Event tracked successfully:", data);

      // Retornar el evento con los datos de la respuesta
      return {
        id: data.id,
        eventType: event.eventType,
        userId: event.userId,
        propertyId: event.propertyId,
        orgId: event.orgId,
        metadata: event.metadata,
        occurredAt: new Date(data.occurred_at),
        createdAt: new Date(data.occurred_at),
      };
    } catch (error) {
      console.error("❌ Exception tracking event:", error);
      throw error;
    }
  }

  async getPropertyMetrics(propertyId: string): Promise<PropertyMetrics | null> {
    const { data, error } = await this.supabase
      .from("properties_metrics")
      .select("*")
      .eq("property_id", propertyId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return null;
      }
      console.error("Error fetching property metrics:", error);
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }

    return this.mapRowToMetrics(data);
  }

  async getBulkPropertyMetrics(
    propertyIds: string[]
  ): Promise<Map<string, PropertyMetrics>> {
    if (propertyIds.length === 0) {
      return new Map();
    }

    const { data, error } = await this.supabase
      .from("properties_metrics")
      .select("*")
      .in("property_id", propertyIds);

    if (error) {
      console.error("Error fetching bulk property metrics:", error);
      throw new Error(`Failed to fetch bulk metrics: ${error.message}`);
    }

    const metricsMap = new Map<string, PropertyMetrics>();
    
    for (const row of data || []) {
      const metrics = this.mapRowToMetrics(row);
      metricsMap.set(metrics.propertyId, metrics);
    }

    return metricsMap;
  }

  private mapRowToMetrics(row: MetricsRow): PropertyMetrics {
    return {
      propertyId: row.property_id,
      viewsCount: row.views_count,
      clicksCount: row.clicks_count,
      contactsCount: row.contacts_count,
      sharesCount: row.shares_count,
      chatMessagesCount: row.chat_messages_count,
      lastEventAt: row.last_event_at ? new Date(row.last_event_at) : null,
      updatedAt: new Date(row.updated_at),
    };
  }
}
