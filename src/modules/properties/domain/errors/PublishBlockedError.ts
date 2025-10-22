// src/modules/properties/domain/errors/PublishBlockedError.ts
// Publicación detenida por reglas (score < min, doc faltante, etc.).

import { BaseDomainError, ERROR_CODE } from "./BaseDomainError";

export class PublishBlockedError extends BaseDomainError<typeof ERROR_CODE.PUBLISH_BLOCKED> {
  constructor(
    message = "Publish blocked by policy",
    opts?: { cause?: unknown; details?: Record<string, unknown> & { reasons?: string[] } }
  ) {
    super(ERROR_CODE.PUBLISH_BLOCKED, message, opts);
  }
}
