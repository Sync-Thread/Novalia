// Tipos de eventos de telemetría según la migración 2500_properties_metrics.sql
export type EventType =
  | "page_view"           // Vista de página de propiedad
  | "property_click"      // Click en card de propiedad
  | "first_contact"       // Primer contacto con el propietario
  | "share"               // Compartir propiedad
  | "chat_message";       // Mensaje de chat

export interface EventMetadata {
  source?: string;          // Origen: 'home', 'search', 'quickview', 'details'
  referrer?: string;        // URL de referencia
  userAgent?: string;       // User agent del navegador
  sessionId?: string;       // ID de sesión
  [key: string]: any;       // Metadatos adicionales
}

export interface Event {
  id?: string;
  eventType: EventType;
  userId?: string | null;   // null para usuarios anónimos
  propertyId?: string | null;
  orgId?: string | null;
  metadata?: EventMetadata;
  occurredAt: Date;
  createdAt?: Date;
}

export interface PropertyMetrics {
  propertyId: string;
  viewsCount: number;
  clicksCount: number;
  contactsCount: number;
  sharesCount: number;
  chatMessagesCount: number;
  lastEventAt: Date | null;
  updatedAt: Date;
}
