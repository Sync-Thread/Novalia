// src/modules/properties/domain/clock.ts
// Minimal clock contract to keep domain pure (application provides implementation).

export interface DomainClock {
  now(): Date;
}

