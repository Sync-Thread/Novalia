import type { Event, EventType } from "../entities/Event";
import type { EventRepository } from "../ports/EventRepository";

/**
 * Caso de uso: Registrar evento de telemetría
 * Encapsula la lógica de negocio para tracking de eventos
 */
export class TrackEventUseCase {
  constructor(private readonly eventRepository: EventRepository) {}

  /**
   * Ejecuta el registro de un evento
   * @param params - Parámetros del evento
   * @returns Promise con el evento registrado
   */
  async execute(params: {
    eventType: EventType;
    propertyId?: string;
    userId?: string | null;
    metadata?: Record<string, any>;
  }): Promise<Event> {
    const event: Event = {
      eventType: params.eventType,
      propertyId: params.propertyId ?? null,
      userId: params.userId ?? null,
      metadata: params.metadata ?? {},
      occurredAt: new Date(),
    };

    return await this.eventRepository.trackEvent(event);
  }
}
