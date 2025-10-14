// src/modules/properties/domain/errors/KycRequiredError.ts
// Gate de publicación: KYC requerido.

import { BaseDomainError, ERROR_CODE } from "./BaseDomainError";

export class KycRequiredError extends BaseDomainError<typeof ERROR_CODE.KYC_REQUIRED> {
  constructor(message = "KYC required to publish", opts?: { cause?: unknown; details?: Record<string, unknown> }) {
    super(ERROR_CODE.KYC_REQUIRED, message, opts);
  }
}
