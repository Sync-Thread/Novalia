import type { PropertyMetrics } from "../entities/Event";
import type { EventRepository } from "../ports/EventRepository";

/**
 * Caso de uso: Obtener métricas de propiedades
 */
export class GetPropertyMetricsUseCase {
  constructor(private readonly eventRepository: EventRepository) {}

  /**
   * Obtiene las métricas de una propiedad
   */
  async execute(propertyId: string): Promise<PropertyMetrics | null> {
    return await this.eventRepository.getPropertyMetrics(propertyId);
  }

  /**
   * Obtiene las métricas de múltiples propiedades (para listados)
   */
  async executeMany(
    propertyIds: string[]
  ): Promise<Map<string, PropertyMetrics>> {
    return await this.eventRepository.getBulkPropertyMetrics(propertyIds);
  }
}
