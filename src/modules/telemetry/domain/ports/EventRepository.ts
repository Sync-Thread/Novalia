import type { Event, PropertyMetrics } from "../entities/Event";

/**
 * Puerto de salida (output port) para el repositorio de eventos de telemetría.
 * Define las operaciones que la infraestructura debe implementar.
 */
export interface EventRepository {
  /**
   * Registra un nuevo evento de telemetría
   * @param event - Evento a registrar
   * @returns Promise con el evento registrado (incluyendo ID generado)
   */
  trackEvent(event: Event): Promise<Event>;

  /**
   * Obtiene las métricas agregadas de una propiedad
   * @param propertyId - ID de la propiedad
   * @returns Promise con las métricas o null si no existen
   */
  getPropertyMetrics(propertyId: string): Promise<PropertyMetrics | null>;

  /**
   * Obtiene las métricas de múltiples propiedades
   * @param propertyIds - Array de IDs de propiedades
   * @returns Promise con un mapa de propertyId -> metrics
   */
  getBulkPropertyMetrics(
    propertyIds: string[]
  ): Promise<Map<string, PropertyMetrics>>;
}
