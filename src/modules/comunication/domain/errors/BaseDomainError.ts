export type DomainErrorCode = string;

export class BaseDomainError<TCode extends DomainErrorCode = DomainErrorCode> extends Error {
  readonly code: TCode;
  readonly cause?: unknown;
  readonly details?: Record<string, unknown>;

  constructor(code: TCode, message: string, options?: { cause?: unknown; details?: Record<string, unknown> }) {
    super(message);
    this.code = code;
    this.cause = options?.cause;
    this.details = options?.details;
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
