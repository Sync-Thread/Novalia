// src/modules/properties/domain/errors/StatusTransitionError.ts
// Transición de estado inválida (from→to).

import { BaseDomainError, ERROR_CODE } from "./BaseDomainError";

export class StatusTransitionError extends BaseDomainError<typeof ERROR_CODE.STATUS_TRANSITION> {
  constructor(
    from: string,
    to: string,
    message = `Invalid status transition`,
    opts?: { cause?: unknown; details?: Record<string, unknown> }
  ) {
    super(
      ERROR_CODE.STATUS_TRANSITION,
      `${message}: ${from} → ${to}`,
      { ...opts, details: { ...(opts?.details ?? {}), from, to } }
    );
  }
}
