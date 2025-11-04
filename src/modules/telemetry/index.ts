// Domain exports
export type {
  Event,
  EventType,
  EventMetadata,
  PropertyMetrics,
} from "./domain/entities/Event";

export type { EventRepository } from "./domain/ports/EventRepository";

// Application exports
export { TrackEventUseCase } from "./application/TrackEventUseCase";
export { GetPropertyMetricsUseCase } from "./application/GetPropertyMetricsUseCase";

// Infrastructure exports
export { SupabaseEventRepository } from "./infrastructure/SupabaseEventRepository";

// UI exports (hooks)
export { useTelemetry } from "./UI/hooks/useTelemetry";

// UI exports (components)
export { PropertyMetricsCard } from "./UI/components/PropertyMetricsCard";
