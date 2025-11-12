import { BaseDomainError } from "./BaseDomainError";

export class InvariantViolationError extends BaseDomainError<"INVARIANT_VIOLATION"> {
  constructor(message: string, options?: { cause?: unknown; details?: Record<string, unknown> }) {
    super("INVARIANT_VIOLATION", message, options);
  }
}
