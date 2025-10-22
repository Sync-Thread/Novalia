// src/modules/properties/domain/errors/BaseDomainError.ts
// Error base del dominio con código, causa y (opcional) detalles.

export const ERROR_CODE = {
  INVALID_VALUE: "INVALID_VALUE",
  INVARIANT_VIOLATION: "INVARIANT_VIOLATION",
  KYC_REQUIRED: "KYC_REQUIRED",
  RPP_REJECTED: "RPP_REJECTED",
  PUBLISH_BLOCKED: "PUBLISH_BLOCKED",
  STATUS_TRANSITION: "STATUS_TRANSITION",
} as const;
export type DomainErrorCode = typeof ERROR_CODE[keyof typeof ERROR_CODE];

export class BaseDomainError<T extends DomainErrorCode = DomainErrorCode> extends Error {
  readonly code: T;
  readonly cause?: unknown;
  readonly details?: Record<string, unknown>;

  constructor(code: T, message: string, opts?: { cause?: unknown; details?: Record<string, unknown> }) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.cause = opts?.cause;
    this.details = opts?.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
