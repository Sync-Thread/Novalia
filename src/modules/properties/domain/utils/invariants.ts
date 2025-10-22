// src/modules/properties/domain/utils/invariants.ts
// Shared guards to keep constructors concise.

import { InvalidValueError } from "../errors/InvalidValueError";

export function requireNonEmpty(value: string | null | undefined, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new InvalidValueError(`${field} is required`, { details: { field, value } });
  }
  return value.trim();
}

export function requirePositiveNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidValueError(`${field} must be > 0`, { details: { field, value } });
  }
  return value;
}

export function requireNonNegativeInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidValueError(`${field} must be a non-negative integer`, { details: { field, value } });
  }
  return value;
}

