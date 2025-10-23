// src/modules/properties/domain/errors/InvalidValueError.ts
// Valores fuera de rango/forma (m² negativos, fechas inválidas, etc.).

import { BaseDomainError, ERROR_CODE } from "./BaseDomainError";

export class InvalidValueError extends BaseDomainError<typeof ERROR_CODE.INVALID_VALUE> {
  constructor(message = "Invalid value", opts?: { cause?: unknown; details?: Record<string, unknown> }) {
    super(ERROR_CODE.INVALID_VALUE, message, opts);
  }
}
