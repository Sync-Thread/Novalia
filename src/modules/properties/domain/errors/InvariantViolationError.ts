// src/modules/properties/domain/errors/InvariantViolationError.ts
// Rompe invariantes (p.ej. published ⇒ published_at, sold ⇒ sold_at).

import { BaseDomainError, ERROR_CODE } from "./BaseDomainError";

export class InvariantViolationError extends BaseDomainError<typeof ERROR_CODE.INVARIANT_VIOLATION> {
  constructor(message = "Invariant violation", opts?: { cause?: unknown; details?: Record<string, unknown> }) {
    super(ERROR_CODE.INVARIANT_VIOLATION, message, opts);
  }
}
