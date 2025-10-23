// src/modules/properties/domain/errors/RppRejectedError.ts
// Bloqueo si RPP está rechazado.

import { BaseDomainError, ERROR_CODE } from "./BaseDomainError";

export class RppRejectedError extends BaseDomainError<typeof ERROR_CODE.RPP_REJECTED> {
  constructor(message = "RPP rejected", opts?: { cause?: unknown; details?: Record<string, unknown> }) {
    super(ERROR_CODE.RPP_REJECTED, message, opts);
  }
}
