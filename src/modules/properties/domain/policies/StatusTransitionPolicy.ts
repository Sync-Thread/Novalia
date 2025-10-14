// src/modules/properties/domain/policies/StatusTransitionPolicy.ts
// Transiciones válidas entre estados.

import type { PropertyStatus } from "../enums";
import { StatusTransitionError } from "../errors/StatusTransitionError";

export const VALID_TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  draft: ["published"],
  published: ["draft", "sold"],
  sold: [], // terminal
};

export function canTransition(from: PropertyStatus, to: PropertyStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: PropertyStatus, to: PropertyStatus): void {
  if (!canTransition(from, to)) throw new StatusTransitionError(from, to);
}
